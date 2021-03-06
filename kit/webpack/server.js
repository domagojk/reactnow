/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

// ----------------------
// IMPORTS

import path from 'path';
import webpack from 'webpack';
import Config from 'webpack-config';

// Plugin to allow us to exclude `node_modules` packages from the final
// bundle.  Since we'll be running `server.js` from Node, we'll have access
// to those modules locally and they don't need to wind up in the bundle file
import nodeModules from 'webpack-node-externals';

import PATHS from '../../paths';

// ----------------------

// Helper function to recursively filter through loaders, and apply the
// supplied function
function recursiveLoader(root = {}, func) {
  if (root.loaders) {
    root.loaders.forEach(l => recursiveLoader(l, func));
  }
  if (root.loader) return func(root);
  return false;
}

export default new Config().extend({
  '[root]/base.js': config => {
    // Prevent file emission, since the browser bundle will already have done it
    config.module.loaders.forEach(loader => {
      recursiveLoader(loader, l => {
        if (l.loader === 'file-loader') {
          // eslint-disable-next-line
          l.query.emitFile = false;
        }
      });
    });

    return config;
  },
}).merge({

  // Set the target to Node.js, since we'll be running the bundle on the server
  target: 'node',

  // Output to the `dist` folder
  output: {
    path: PATHS.dist,
    filename: 'server.js',
  },

  entry: {
    javascript: [
      // Vendors
      path.join(PATHS.entry, 'vendor.js'),
      // Server entry point
      path.join(PATHS.entry, 'server.js'),
    ],
  },

  // Make __dirname work properly
  node: {
    __dirname: true,
  },

  module: {
    loaders: [
      // .css files should make the classnames available to our Node code,
      // but shouldn't emit anything
      {
        test: /\.css$/,
        loaders: [
          {
            loader: 'css-loader/locals',
            query: {
              modules: true,
            },
          },
          'postcss-loader',
        ],
      },
      // Do the same with SASS files-- get the classnames, but don't emit
      {
        test: /\.s(c|a)ss$/,
        loaders: [
          {
            loader: 'css-loader/locals',
          },
          'sass-loader',
        ],
      },
      // .js(x) files can extend the `.babelrc` file at the root of the project
      // (which was used to spawn Webpack in the first place), because that's
      // exactly the same polyfill config we'll want to use for this bundle
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: [
            'react',
          ],
        },
      },

      // .ejs views
      {
        test: /\.ejs$/,
        loader: 'raw-loader',
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      // We're running on the Node.js server, so set `SERVER` to true
      SERVER: true,
    }),
  ],
  // No need to transpile `node_modules` files, since they'll obviously
  // still be available to Node.js when we run the resulting `server.js` entry
  externals: nodeModules(),
});
