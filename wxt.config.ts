import { defineConfig } from 'wxt';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ArcoResolver } from 'unplugin-vue-components/resolvers';
import UnoCSS from 'unocss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/i18n/module'],
  manifest: {
    name: '__MSG_app_name__',
    description: '__MSG_app_description__',
    default_locale: 'en',
  },
  i18n: {
    localesDir: resolve(__dirname, 'locales'),
  },
  vite: () => ({
    plugins: [
      UnoCSS(),
      AutoImport({
        imports: ['vue'],
        dts: 'typings/auto-imports.d.ts',
      }),
      Components({
        dirs: ['components'],
        dts: 'typings/components.d.ts',
        resolvers: [
          ArcoResolver({
            sideEffect: true,
          }),
        ],
      }),
    ],
  }),
});
