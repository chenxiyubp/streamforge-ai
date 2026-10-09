const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  css: { extract: true, loaderOptions: { sass: { implementation: require('sass') } } },
  devServer: {
    host: 'localhost', port: 2023,
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:8200', changeOrigin: true, pathRewrite: { '^/api': '' } },
      '/wschat': { target: process.env.WS_PROXY_TARGET || 'ws://127.0.0.1:1688', ws: true, changeOrigin: true, pathRewrite: { '^/wschat': '/ljl/bilibili/chat' } }
    }
  }
})
