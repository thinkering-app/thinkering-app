module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Inlines the drizzle .sql migration files bundled from @thinkering/db.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  }
}
