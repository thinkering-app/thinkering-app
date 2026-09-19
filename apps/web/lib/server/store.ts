/**
 * Metering store (docs/02 §Device identity, docs/04 §Usage metering).
 * Operational data only — never user learning data, never prompt/response
 * bodies. Supabase (service role) in production, in-memory for dev/tests.
 */

export interface DeviceRecord {
  deviceId: string
  /**
   * The HMAC key issued at registration. Stored raw (service-role-only table):
   * a one-way hash could not verify request signatures. App Attest hardening
   * comes later (D10).
   */
  secret: string
  platform: string
  createdAt: number
  attested: boolean
}

export interface UsageRecord {
  inputTokens: number
  outputTokens: number
  calls: number
  /** Per-kind call counts for burst limits. */
  kindCalls: Record<string, number>
}

export const EMPTY_USAGE: UsageRecord = { inputTokens: 0, outputTokens: 0, calls: 0, kindCalls: {} }

export interface UsageDelta {
  /** Burst-limit counters this delta moves, each by `calls`: the call's kind, plus `repair` for a repair round-trip. */
  counters: string[]
  /** +1 to count a call, −1 to release one that was refused, 0 to settle tokens. */
  calls: number
  inputTokens: number
  /** Negative when settling returns an unused reservation. */
  outputTokens: number
}

/** Token totals across every device for one day: the proxy-wide cap. */
export interface TokenTotals {
  inputTokens: number
  outputTokens: number
}

export interface UsageAfter {
  device: UsageRecord
  total: TokenTotals
}

export interface MeteringStore {
  createDevice(device: DeviceRecord): Promise<void>
  getDevice(deviceId: string): Promise<DeviceRecord | null>
  /** Usage for a UTC day key (YYYY-MM-DD). */
  getUsage(deviceId: string, day: string): Promise<UsageRecord>
  /**
   * Applies a delta to the device's day and to the day's proxy-wide totals in
   * one atomic step and returns both afterwards, so concurrent calls each see
   * the others' reservations (docs/04 §Usage metering).
   */
  addUsage(deviceId: string, day: string, delta: UsageDelta): Promise<UsageAfter>
  /**
   * Persistent per-device/day counters for the routes that don't spend tokens
   * (docs/02 §Feedback). A count, never any submitted content.
   */
  getActionCount(deviceId: string, day: string, action: string): Promise<number>
  addAction(deviceId: string, day: string, action: string): Promise<void>
  /**
   * Counts an unsigned action from an IP address for a UTC day and returns the
   * count including this one (docs/02 §Device identity). Persistent stores key
   * it by a keyed hash of the address and the day, never the address itself.
   */
  countIpAction(ip: string, day: string, action: 'register'): Promise<number>
}

export class MemoryStore implements MeteringStore {
  private devices = new Map<string, DeviceRecord>()
  private usage = new Map<string, UsageRecord>()
  private actions = new Map<string, number>()
  private totals = new Map<string, TokenTotals>()
  private ipActions = new Map<string, number>()

  async createDevice(device: DeviceRecord): Promise<void> {
    this.devices.set(device.deviceId, device)
  }

  async getDevice(deviceId: string): Promise<DeviceRecord | null> {
    return this.devices.get(deviceId) ?? null
  }

  async getUsage(deviceId: string, day: string): Promise<UsageRecord> {
    return this.usage.get(`${deviceId}:${day}`) ?? { ...EMPTY_USAGE, kindCalls: {} }
  }

  async addUsage(deviceId: string, day: string, delta: UsageDelta): Promise<UsageAfter> {
    // Read and write with no await between them: that is this store's atomicity.
    const current = this.usage.get(`${deviceId}:${day}`) ?? EMPTY_USAGE
    const kindCalls = { ...current.kindCalls }
    for (const counter of delta.counters)
      kindCalls[counter] = (kindCalls[counter] ?? 0) + delta.calls
    const device = {
      inputTokens: current.inputTokens + delta.inputTokens,
      outputTokens: current.outputTokens + delta.outputTokens,
      calls: current.calls + delta.calls,
      kindCalls,
    }
    const totals = this.totals.get(day) ?? { inputTokens: 0, outputTokens: 0 }
    const total = {
      inputTokens: totals.inputTokens + delta.inputTokens,
      outputTokens: totals.outputTokens + delta.outputTokens,
    }
    this.usage.set(`${deviceId}:${day}`, device)
    this.totals.set(day, total)
    return { device, total }
  }

  async getActionCount(deviceId: string, day: string, action: string): Promise<number> {
    return this.actions.get(`${deviceId}:${day}:${action}`) ?? 0
  }

  async addAction(deviceId: string, day: string, action: string): Promise<void> {
    const key = `${deviceId}:${day}:${action}`
    this.actions.set(key, (this.actions.get(key) ?? 0) + 1)
  }

  async countIpAction(ip: string, day: string, action: 'register'): Promise<number> {
    const key = `${ip}:${day}:${action}`
    const count = (this.ipActions.get(key) ?? 0) + 1
    this.ipActions.set(key, count)
    return count
  }
}
