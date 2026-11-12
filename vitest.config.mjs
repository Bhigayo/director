import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Sunrise tests use UK clock times
  test: { include: ['src/**/*.test.ts'], env: { TZ: 'Europe/London' } },
})
