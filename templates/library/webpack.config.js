const path = require('path')
const isDevMode = process.env.NODE_ENV !== 'production'

module.exports = {
  entry: './src/index',
  mode: isDevMode ? 'development' : 'production',
  devtool: isDevMode ? 'cheap-module-source-map' : false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: require('./package.json').name,
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('babel-loader'),
          },
        ],
      },
    ],
  },
}
