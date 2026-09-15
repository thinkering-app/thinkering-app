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
  kind: string
  inputTokens: number
  outputTokens: number
}

export interface MeteringStore {
  createDevice(device: DeviceRecord): Promise<void>
  getDevice(deviceId: string): Promise<DeviceRecord | null>
  /** Usage for a UTC day key (YYYY-MM-DD). */
  getUsage(deviceId: string, day: string): Promise<UsageRecord>
  addUsage(deviceId: string, day: string, delta: UsageDelta): Promise<void>
  /**
   * Persistent per-device/day counters for the routes that don't spend tokens
   * (docs/02 §Feedback). A count, never any submitted content.
   */
  getActionCount(deviceId: string, day: string, action: string): Promise<number>
  addAction(deviceId: string, day: string, action: string): Promise<void>
}

export class MemoryStore implements MeteringStore {
  private devices = new Map<string, DeviceRecord>()
  private usage = new Map<string, UsageRecord>()
  private actions = new Map<string, number>()

  async createDevice(device: DeviceRecord): Promise<void> {
    this.devices.set(device.deviceId, device)
  }

  async getDevice(deviceId: string): Promise<DeviceRecord | null> {
    return this.devices.get(deviceId) ?? null
  }

  async getUsage(deviceId: string, day: string): Promise<UsageRecord> {
    return this.usage.get(`${deviceId}:${day}`) ?? { ...EMPTY_USAGE, kindCalls: {} }
  }

  async addUsage(deviceId: string, day: string, delta: UsageDelta): Promise<void> {
    const key = `${deviceId}:${day}`
    const current = await this.getUsage(deviceId, day)
    this.usage.set(key, {
      inputTokens: current.inputTokens + delta.inputTokens,
      outputTokens: current.outputTokens + delta.outputTokens,
      calls: current.calls + 1,
      kindCalls: { ...current.kindCalls, [delta.kind]: (current.kindCalls[delta.kind] ?? 0) + 1 },
    })
  }

  async getActionCount(deviceId: string, day: string, action: string): Promise<number> {
    return this.actions.get(`${deviceId}:${day}:${action}`) ?? 0
  }

  async addAction(deviceId: string, day: string, action: string): Promise<void> {
    const key = `${deviceId}:${day}:${action}`
    this.actions.set(key, (this.actions.get(key) ?? 0) + 1)
  }
}
