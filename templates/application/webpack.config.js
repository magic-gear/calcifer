const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')

const isDevMode = process.env.NODE_ENV !== 'production'

const getStyleLoaders = (cssOptions) => {
  return [
    isDevMode ? require.resolve('style-loader') : { loader: MiniCssExtractPlugin.loader },
    {
      loader: require.resolve('css-loader'),
      options: cssOptions,
    },
    {
      loader: require.resolve('postcss-loader'),
      options: {
        postcssOptions: {
          plugins: [
            'postcss-flexbugs-fixes',
            ['postcss-preset-env', { autoprefixer: { flexbox: 'no-2009' }, stage: 3 }],
            'postcss-normalize',
          ],
        },
        sourceMap: isDevMode,
      },
    },
  ].filter(Boolean)
}

module.exports = {
  entry: './src/index',
  target: 'web',
  mode: isDevMode ? 'development' : 'production',
  devtool: isDevMode ? 'cheap-module-source-map' : false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  devServer: {
    hot: true,
    host: '0.0.0.0',
    contentBase: path.resolve(__dirname, 'dist'),
    historyApiFallback: true,
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
            options: {
              plugins: [isDevMode && require.resolve('react-refresh/babel')].filter(Boolean),
            },
          },
        ],
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: getStyleLoaders({
          importLoaders: 1,
        }),
      },
      {
        test: /\.module\.css$/,
        use: getStyleLoaders({
          importLoaders: 1,
          modules: true,
        }),
      },
      {
        test: /\.less$/,
        use: [
          ...getStyleLoaders({
            modules: true, //use css modules by default
            importLoaders: 2,
          }),
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: 'images/[name].[ext]?[hash]',
              limit: 100 * 1024,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin(),
    !isDevMode &&
      new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      }),
    new CopyPlugin({
      patterns: [
        {
          from: 'public',
          globOptions: {
            ignore: ['**/*index.html'],
          },
          noErrorOnMissing: true,
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    isDevMode && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
}
