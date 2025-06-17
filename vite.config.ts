import { defineConfig } from 'vite'
import { resolve } from 'path'
import pkg from './package.json';
import dts from 'vite-plugin-dts';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
    })
  ],
  build: {
    minify: false,
    outDir: 'lib',
    rollupOptions: {
      external: Object.keys(pkg.dependencies),
      output: {
        globals: Object.fromEntries(Object.keys(pkg.dependencies).map((v) => [v, v])),
      },
    },
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['umd', 'es'],
      name: 'index',
      fileName: 'index'
    }
  },
  resolve: { alias: { '@': resolve('src/') } },
})
