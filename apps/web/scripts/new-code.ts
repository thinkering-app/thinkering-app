import { createClient } from '@supabase/supabase-js'
import { hashBudgetCode, newBudgetCode } from '../lib/server/budget-code'

/**
 * Issues a code that raises one device's daily AI budget (docs/04 §Usage
 * metering). Prints the code once — only its hash is stored, so it cannot be
 * recovered afterwards; issue another if it's lost.
 *
 *   pnpm codes:new --label "beta: alex" --bonus 1000000 --days 30
 *
 * Reading them back and revoking are SQL, in the same dashboard editor that
 * holds `spend_by_day`:
 *   select label, daily_bonus_weighted, redeemed_at, expires_at from budget_codes;
 *   update budget_codes set expires_at = now() where label = 'beta: alex';
 */

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? undefined : process.argv[at + 1]
}

async function main() {
  const label = arg('label')
  const bonus = Number(arg('bonus') ?? 500_000)
  const days = arg('days') ? Number(arg('days')) : undefined

  if (!label) {
    console.error('Usage: pnpm codes:new --label "beta: alex" [--bonus 500000] [--days 30]')
    process.exit(1)
  }
  if (!Number.isFinite(bonus) || bonus <= 0) {
    console.error('--bonus must be a positive number of weighted tokens.')
    process.exit(1)
  }

  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    console.error('No SUPABASE_URL / SUPABASE_SECRET_KEY: put them in apps/web/.env or export them.')
    process.exit(1)
  }

  const code = newBudgetCode()
  const { error } = await createClient(url, secretKey, { auth: { persistSession: false } })
    .from('budget_codes')
    .insert({
      code_hash: hashBudgetCode(secretKey, code),
      label,
      daily_bonus_weighted: bonus,
      expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
    })
  if (error) {
    console.error(`Could not create the code: ${error.message}`)
    process.exit(1)
  }

  console.log(`\n  ${code}\n`)
  console.log(`  ${label} · +${bonus.toLocaleString()} weighted/day${days ? ` · ${days} days` : ''}`)
  console.log('  Shown once. Only its hash is stored.\n')
}

void main()
