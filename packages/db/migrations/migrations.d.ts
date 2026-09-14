// Hand-written declaration for the drizzle-kit generated migrations.js
// (its .sql imports are inlined by babel in the app; see apps/mobile/babel.config.js).
declare const bundle: {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[]
  }
  migrations: Record<string, string>
}
export default bundle
