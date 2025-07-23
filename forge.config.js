const { WebpackPlugin } = require('@electron-forge/plugin-webpack');

module.exports = {
  packagerConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {}
    }
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig: './webpack/webpack.main.config.js',
      renderer: {
        config: './webpack/webpack.renderer.config.js',
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.js',
            name: 'main_window',
            preload: {
              js: './src/preload.js',
              config: './webpack/webpack.preload.config.js'
            }
          }
        ]
      }
    })
  ]
};