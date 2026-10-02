/**
 * The order an ordering or matching block shows its items in (docs/05). The
 * model nearly always writes them already solved — ordering items in their
 * correct order, matching rights in step with their lefts — so the renderer
 * shuffles them. The shuffle is seeded, not random: the same block lays out the
 * same way every time the learner comes back to it. A shuffle that comes out
 * solved is rotated by one, which, with distinct ids, never is.
 */
export function displayOrder(
  ids: readonly string[],
  seed: string,
  solved: readonly string[],
): string[] {
  const next = mulberry32(hashString(seed))
  const out = [...ids]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  const isSolved = out.length === solved.length && out.every((id, i) => id === solved[i])
  return isSolved && out.length > 1 ? [...out.slice(1), out[0]!] : out
}

/** FNV-1a: a stable 32-bit seed from a string. */
function hashString(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A small seeded PRNG, uniform on [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
