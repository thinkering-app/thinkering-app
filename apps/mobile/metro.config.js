const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Drizzle migrations ship as .sql files inlined by babel (see babel.config.js).
config.resolver.sourceExts.push('sql')

// expo-sqlite on web: the wa-sqlite wasm binary is bundled as an asset, and the
// dev server needs cross-origin isolation for OPFS (docs/02; production headers
// live in vercel.json).
config.resolver.assetExts.push('wasm')
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  middleware(req, res, next)
}

module.exports = withNativeWind(config, { input: './src/global.css' })
