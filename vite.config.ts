import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import {
  VueUseComponentsResolver,
  VueUseDirectiveResolver,
  AntDesignVueResolver
} from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    vueJsx(),
    vueDevTools(),
    Components({
      dirs: ['src/components/', 'src/views/'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        VueUseComponentsResolver(),
        VueUseDirectiveResolver(),
        AntDesignVueResolver({
          importStyle: false
        }),
        IconsResolver({
          prefix: 'icon',
          customCollections: ['le']
        })
      ]
    }),
    AutoImport({
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
        /\.vue$/,
        /\.vue\?vue/, // .vue
        /\.md$/ // .md
      ],
      imports: [
        'vue',
        'pinia',
        {
          from: 'vue-router',
          imports: ['RouteLocationRaw'],
          type: true
        },
        '@vueuse/core'
      ],
      dts: true,
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true
      }
    }),
    Icons({
      compiler: 'vue3',
      customCollections: {
        le: FileSystemIconLoader('src/assets/svg/le', svg =>
          svg
            .replace(/^<svg /, '<svg fill="currentColor" ')
            .replace(/fill="#[^"]*"/g, 'fill="currentColor"')
            .replace(/width="[^"]*"/g, 'width="1em"')
            .replace(/height="[^"]*"/g, 'height="1em"')
        )
      },
      autoInstall: true,
      defaultStyle: 'display: inline-block;'
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      // 代理MCP服务器请求以解决CORS问题
      '/mcp-proxy': {
        target: 'https://mcp.api-inference.modelscope.net',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/mcp-proxy/, ''),
        configure: proxy => {
          proxy.on('error', err => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(
              'Received Response from the Target:',
              proxyRes.statusCode,
              req.url
            )
          })
        }
      },
      // 捕获所有messages请求并转发到MCP服务器
      '/messages': {
        target: 'https://mcp.api-inference.modelscope.net',
        changeOrigin: true,
        configure: proxy => {
          proxy.on('error', err => {
            console.log('messages proxy error', err)
          })
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('Messages Request:', req.method, req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Messages Response:', proxyRes.statusCode, req.url)
          })
        }
      }
    }
  }
})
