const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Drizzle migrations ship as .sql files inlined by babel (see babel.config.js).
config.resolver.sourceExts.push('sql')

module.exports = withNativeWind(config, { input: './src/global.css' })
