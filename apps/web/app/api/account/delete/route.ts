import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import { utcDayOf } from '@/lib/server/metering'

/**
 * Deleting a backup account (App Store Review Guideline 5.1.1(v), docs/08):
 * the app offers account creation, so it has to offer deletion in-app — the
 * backup off-switch deletes the *data*, this deletes the account itself.
 *
 * Device-signed like every other route, and authorised by the user's own
 * Supabase access token: the server only ever deletes the account that token
 * belongs to. `sync_rows` goes with it by `on delete cascade`.
 */

const RATE_LIMIT_PER_DAY = 5

export async function POST(req: Request): Promise<Response> {
  const { store, now, deleteAccount } = getDeps()

  const bodyText = await req.text()
  const auth = await verifyDeviceAuth(req, bodyText, store, now())
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status })

  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/)
  if (!bearer) return Response.json({ error: 'missing_access_token' }, { status: 401 })

  const day = utcDayOf(now())
  if ((await store.getActionCount(auth.deviceId, day, 'account_delete')) >= RATE_LIMIT_PER_DAY) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }
  await store.addAction(auth.deviceId, day, 'account_delete')

  const result = await deleteAccount(bearer[1]!)
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
  // Nothing to say back: the account and its rows are gone.
  return Response.json({ ok: true })
}
