const path = require('path');

module.exports = {
  entry: './src/preload.js',
  output: {
    filename: 'preload.js',
    path: path.resolve(__dirname, '.webpack/preload'),
  },
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};