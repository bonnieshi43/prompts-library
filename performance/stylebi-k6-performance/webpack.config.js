const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
  mode: 'production',
  context: path.join(__dirname, 'src'),
  entry: {
    "test-examples-hurricanel": './test-examples-hurricanel.ts',
    "test-d1": './test-d1.ts',
    "test-d1-debug": './test-d1-debug.ts',
    "test-d2": './test-d2.ts',
    "test-d3": './test-d3.ts',
    "test-e1": './test-e1.ts',
    "test-e2": './test-e2.ts',
    "test-d1-new": './test-d1-new.ts',
    "setup-users": './setup-users.ts',
    "cleanup-users": './cleanup-users.ts',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    libraryTarget: 'commonjs',
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'babel-loader',
      },
    ],
  },
  target: 'web',
  externals: /^(k6|https?\:\/\/)(\/.*)?/,
  stats: {
    colors: true,
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
}
