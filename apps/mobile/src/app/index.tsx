import { Redirect } from 'expo-router'
import { listInterests } from '@thinkering/db'

import { db } from '@/db'

/**
 * First run goes to intake (docs/01 §1), which picks up an unfinished one;
 * everyone else lands on Today.
 */
export default function Index() {
  const hasInterest = listInterests(db).length > 0
  return <Redirect href={hasInterest ? '/today' : '/intake'} />
}
