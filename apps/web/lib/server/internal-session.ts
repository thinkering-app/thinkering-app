import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cookieFor, INTERNAL_AREAS, verifySessionToken, type InternalArea } from './internal-auth'

/**
 * The in-page half of the internal gate. `middleware.ts` already turned this
 * request away, but a page that renders privileged content should not depend
 * on a matcher staying correct — so every internal page calls this too.
 */
export async function requireArea(area: InternalArea): Promise<void> {
  if (!(await unlocked(area))) redirect(`/internal/login?next=/internal/${area}`)
}

async function unlocked(area: InternalArea): Promise<boolean> {
  const token = (await cookies()).get(cookieFor(area))?.value
  return verifySessionToken(area, token, Date.now())
}

/** Which areas this visitor has unlocked, for nav and lock state. */
export async function unlockedAreas(): Promise<InternalArea[]> {
  const checks = await Promise.all(
    INTERNAL_AREAS.map(async (area) => ((await unlocked(area)) ? area : undefined)),
  )
  return checks.filter((area): area is InternalArea => area !== undefined)
}
