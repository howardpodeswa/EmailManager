import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['development', 'import', 'node'],
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
    sequence: { concurrent: false },
    fileParallelism: false,
    passWithNoTests: true,
    server: {
      deps: {
        inline: [/^drizzle-orm/],
      },
    },
  },
})
