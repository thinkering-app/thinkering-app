import base from '@thinkering/config/eslint'

export default [...base, { ignores: ['.next/**', 'next-env.d.ts'] }]
