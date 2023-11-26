import { defineConfig } from 'vite';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  // cacheDir: '../../node_modules/.vite/bullmq',

  plugins: [nxViteTsPaths()],

  // @ts-expect-error this works fine, thank you very much...
  test: {
    globals: true,
    cache: { dir: './node_modules/.vitest' },
    environment: 'node',
    include: ['packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
