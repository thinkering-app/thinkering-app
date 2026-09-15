import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { EMPTY_USAGE, type DeviceRecord, type MeteringStore, type UsageDelta, type UsageRecord } from './store'

/**
 * Supabase-backed metering store (service role — operational tables only; RLS
 * user-data tables are untouched here). Schema: supabase/schema.sql.
 *
 * addUsage is read-modify-write: at beta scale a lost increment costs us a few
 * tokens of accounting, not correctness. Move to an RPC if it ever matters.
 */
export class SupabaseStore implements MeteringStore {
  private client: SupabaseClient

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
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

  async addUsage(deviceId: string, day: string, delta: UsageDelta): Promise<void> {
    const current = await this.getUsage(deviceId, day)
    const { error } = await this.client.from('device_usage').upsert(
      {
        device_id: deviceId,
        day,
        input_tokens: current.inputTokens + delta.inputTokens,
        output_tokens: current.outputTokens + delta.outputTokens,
        calls: current.calls + 1,
        kind_calls: { ...current.kindCalls, [delta.kind]: (current.kindCalls[delta.kind] ?? 0) + 1 },
      },
      { onConflict: 'device_id,day' },
    )
    if (error) throw new Error(`device_usage upsert failed: ${error.message}`)
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
}
