var path = require('path');
//var WebpackFtpUpload = require('webpack-ftp-upload')

module.exports = {
  mode: 'development', //'development' or 'production' will minify the code
  entry: './src/helix/Main.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: []
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
