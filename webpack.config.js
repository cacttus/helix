var path = require('path');
//var WebpackFtpUpload = require('webpack-ftp-upload')

module.exports = {
  mode: 'development', //'development' or 'production' will minify the code
  entry: './src/Main.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: [/node_modules/, path.resolve(__dirname, "./src/index.tsx")]
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
      filename: 'main.bundle.js',
    publicPath: "/assets/"
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
   devServer: {
	  host: "localhost",
	  port: 8000,
	  https: false
  },

};
