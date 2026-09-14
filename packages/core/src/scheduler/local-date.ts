/**
 * Day boundaries (D12): a "day" is device-local midnight to midnight, computed in
 * the device's IANA timezone. Local dates are plain `YYYY-MM-DD` strings, which
 * compare correctly with `<`/`>`.
 */

export type LocalDate = string // YYYY-MM-DD

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timeZone)
  if (!fmt) {
    // en-CA formats as YYYY-MM-DD.
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    formatters.set(timeZone, fmt)
  }
  return fmt
}

/** The local calendar date of an epoch-ms instant in the given timezone. */
export function localDateOf(epochMs: number, timeZone: string): LocalDate {
  return formatterFor(timeZone).format(new Date(epochMs))
}

export function isSameLocalDay(aMs: number, bMs: number, timeZone: string): boolean {
  return localDateOf(aMs, timeZone) === localDateOf(bMs, timeZone)
}
