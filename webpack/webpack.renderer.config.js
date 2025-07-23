module.exports = {
  entry: './src/renderer.js',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  output: {
    filename: 'renderer.js',
    path: __dirname + '/.webpack/renderer'
  },
  target: 'electron-renderer'
};