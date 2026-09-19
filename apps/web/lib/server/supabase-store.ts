import { createHmac } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  EMPTY_USAGE,
  type DeviceRecord,
  type MeteringStore,
  type UsageAfter,
  type UsageDelta,
  type UsageRecord,
} from './store'

/**
 * Supabase-backed metering store. The secret key puts it on the `service_role`
 * Postgres role, so it reaches the operational tables and bypasses RLS — which
 * is why it stays away from the user-data mirror entirely. Schema:
 * supabase/schema.sql.
 *
 * addUsage and countIpAction are single-statement RPCs and claimSpendAlert a
 * single insert, so concurrent requests can't lose each other's writes;
 * addAction is still read-modify-write, which only costs a feedback message or
 * two past its limit.
 */
export class SupabaseStore implements MeteringStore {
  private client: SupabaseClient

  constructor(
    url: string,
    private secretKey: string,
  ) {
    this.client = createClient(url, secretKey, { auth: { persistSession: false } })
  }

  async createDevice(device: DeviceRecord): Promise<void> {
    const { error } = await this.client.from('devices').insert({
      device_id: device.deviceId,
      secret: device.secret,
      platform: device.platform,
      created_at: new Date(device.createdAt).toISOString(),
      attested: device.attested,
    })
    if (error) throw new Error(`devices insert failed: ${error.message}`)
  }

  async getDevice(deviceId: string): Promise<DeviceRecord | null> {
    const { data, error } = await this.client
      .from('devices')
      .select('device_id, secret, platform, created_at, attested')
      .eq('device_id', deviceId)
      .maybeSingle()
    if (error) throw new Error(`devices select failed: ${error.message}`)
    if (!data) return null
    return {
      deviceId: data.device_id,
      secret: data.secret,
      platform: data.platform,
      createdAt: Date.parse(data.created_at),
      attested: data.attested,
    }
  }

  async getUsage(deviceId: string, day: string): Promise<UsageRecord> {
    const { data, error } = await this.client
      .from('device_usage')
      .select('input_tokens, output_tokens, calls, kind_calls')
      .eq('device_id', deviceId)
      .eq('day', day)
      .maybeSingle()
    if (error) throw new Error(`device_usage select failed: ${error.message}`)
    if (!data) return { ...EMPTY_USAGE, kindCalls: {} }
    return {
      inputTokens: data.input_tokens,
      outputTokens: data.output_tokens,
      calls: data.calls,
      kindCalls: (data.kind_calls as Record<string, number> | null) ?? {},
    }
  }

  async addUsage(deviceId: string, day: string, delta: UsageDelta): Promise<UsageAfter> {
    const { data, error } = await this.client.rpc('add_device_usage', {
      p_device_id: deviceId,
      p_day: day,
      p_counters: delta.counters,
      p_calls: delta.calls,
      p_input_tokens: delta.inputTokens,
      p_output_tokens: delta.outputTokens,
    })
    if (error) throw new Error(`add_device_usage failed: ${error.message}`)
    const row = data as {
      input_tokens: number
      output_tokens: number
      calls: number
      kind_calls: Record<string, number>
      total_input_tokens: number
      total_output_tokens: number
    }
    return {
      device: {
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        calls: row.calls,
        kindCalls: row.kind_calls,
      },
      total: {
        inputTokens: Number(row.total_input_tokens),
        outputTokens: Number(row.total_output_tokens),
      },
    }
  }

  async getActionCount(deviceId: string, day: string, action: string): Promise<number> {
    const { data, error } = await this.client
      .from('device_actions')
      .select('count')
      .eq('device_id', deviceId)
      .eq('day', day)
      .eq('action', action)
      .maybeSingle()
    if (error) throw new Error(`device_actions select failed: ${error.message}`)
    return data?.count ?? 0
  }

  async addAction(deviceId: string, day: string, action: string): Promise<void> {
    const current = await this.getActionCount(deviceId, day, action)
    const { error } = await this.client
      .from('device_actions')
      .upsert({ device_id: deviceId, day, action, count: current + 1 }, { onConflict: 'device_id,day,action' })
    if (error) throw new Error(`device_actions upsert failed: ${error.message}`)
  }

  async countIpAction(ip: string, day: string, action: 'register'): Promise<number> {
    // Keyed by the day too, so a row can't be matched to the same address on
    // another day, and by our secret key, so the IPv4 space can't be brute-forced
    // back out of a leaked table.
    const ipHash = createHmac('sha256', this.secretKey).update(`${day}.${ip}`).digest('hex')
    const { data, error } = await this.client.rpc('count_ip_action', {
      p_ip_hash: ipHash,
      p_day: day,
      p_action: action,
    })
    if (error) throw new Error(`count_ip_action failed: ${error.message}`)
    return data as number
  }

  async claimSpendAlert(day: string, level: number): Promise<boolean> {
    // A duplicate is skipped and returns no row: the insert is the claim.
    const { data, error } = await this.client
      .from('spend_alerts')
      .upsert({ day, level }, { onConflict: 'day,level', ignoreDuplicates: true })
      .select('level')
    if (error) throw new Error(`spend_alerts insert failed: ${error.message}`)
    return data.length > 0
  }
}
