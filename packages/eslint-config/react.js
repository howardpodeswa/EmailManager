import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import base from './index.js'

/**
 * Browser + React variant of the shared config, for the Vite web app. Same TypeScript rules as the
 * Node config, but with browser globals and the React hooks rules.
 */
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
]
