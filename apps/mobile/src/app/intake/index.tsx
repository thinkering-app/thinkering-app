import { Redirect } from 'expo-router'
import { isDraftWorthKeeping, resumeIntakeStep } from '@thinkering/core'
import { listInterests } from '@thinkering/db'

import { db } from '@/db'
import { useIntake } from '@/intake/context'
import { stepHref } from '@/intake/steps'

/**
 * Where "add an interest" lands: an unfinished intake picks up at the step it
 * was on; otherwise the first question, after the welcome for a first interest.
 */
export default function IntakeIndex() {
  const { answers, step } = useIntake()
  if (isDraftWorthKeeping(answers))
    return <Redirect href={stepHref(resumeIntakeStep({ answers, step }))} />
  return <Redirect href={listInterests(db).length > 0 ? '/intake/learn' : '/intake/welcome'} />
}
