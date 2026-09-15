import base from './base.js'

/**
 * ESLint config for packages/core: determinism is enforced by lint (docs/10-testing.md).
 * Core takes now()/newId() from an injected context; ambient time, randomness, and
 * direct UUID generation are banned so scheduler tests can't flake.
 */
export default [
  ...base,
  {
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message: 'Use the injected context clock (now()) instead of Date.now() in packages/core.',
        },
        {
          object: 'Math',
          property: 'random',
          message: 'Use the injected context instead of Math.random() in packages/core.',
        },
        {
          object: 'crypto',
          property: 'randomUUID',
          message: 'Use the injected context id generator (newId()) in packages/core.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Use the injected context clock instead of new Date() in packages/core.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'uuid',
              message: 'Use the injected context id generator (newId()) in packages/core.',
            },
          ],
        },
      ],
    },
  },
]
