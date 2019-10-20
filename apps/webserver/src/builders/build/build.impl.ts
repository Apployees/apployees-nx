import * as path from 'path';
import * as fs from 'fs-extra';
import { resolve } from 'path';
import chalk from 'chalk';
import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { runWebpack, runWebpackDevServer } from '@angular-devkit/build-webpack';
import { forkJoin, from, iif, Observable, of, pipe } from 'rxjs';
import { concatMap, flatMap, map, single, switchMap } from 'rxjs/operators';
import { getSourceRoot, OUT_FILENAME, WebpackBuildEvent, writePackageJson } from '@apployees-nx/common-build-utils';
import { BuildWebserverBuilderOptions } from '../../utils/common/webserver-types';
import { normalizeBuildOptions } from '../../utils/common/normalize';
import { getServerConfig } from '../../utils/server/server-config';
import { getClientConfig } from '../../utils/client/client-config';
import { checkBrowsers } from 'react-dev-utils/browsersHelper';
import * as openBrowser from 'react-dev-utils/openBrowser';
import * as FileSizeReporter from 'react-dev-utils/FileSizeReporter';
import {
  choosePort,
  prepareUrls,
  printInstructions,
  createCompiler
} from 'react-dev-utils/WebpackDevServerUtils';
import * as errorOverlayMiddleware from 'react-dev-utils/errorOverlayMiddleware';
import * as evalSourceMapMiddleware from 'react-dev-utils/evalSourceMapMiddleware';
import clearConsole = require('react-dev-utils/clearConsole');
import _ = require('lodash');
import { Configuration } from 'webpack';
import * as webpack from 'webpack';
import escape = require('escape-string-regexp');
import WebpackDevServer = require('webpack-dev-server');

const measureFileSizesBeforeBuild =
  FileSizeReporter.measureFileSizesBeforeBuild;
const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

const isInteractive = process.stdout.isTTY;

try {
  require('dotenv').config();
} catch (e) {
}


export default createBuilder<JsonObject & BuildWebserverBuilderOptions>(run);

function run(
  options: JsonObject & BuildWebserverBuilderOptions,
  context: BuilderContext
): Observable<WebpackBuildEvent> {

  const mode = options.dev ? 'development' : 'production';
  // do this otherwise our bootstrapped @apployees-nx/node actually replaces this
  // to "development" or "production" at build time.
  const nodeEnv = 'NODE_ENV';
  const babelEnv = 'BABEL_ENV';
  process.env[nodeEnv] = mode;
  process.env[babelEnv] = mode;

  let devServer;
  const devSocket = {
    warnings: warnings =>
      devServer.sockWrite(devServer.sockets, 'warnings', warnings),
    errors: errors =>
      devServer.sockWrite(devServer.sockets, 'errors', errors),
  };
  let yarnExists;

  return from(getSourceRoot(context)).pipe(
    map(sourceRoot =>
      normalizeBuildOptions(options, context.workspaceRoot, sourceRoot)
    ),
    switchMap((options: BuildWebserverBuilderOptions) =>
      checkBrowsers(path.resolve(options.root, options.sourceRoot), isInteractive)
        .then(() => options)),
    switchMap((options: BuildWebserverBuilderOptions) => {

      yarnExists = fs.existsSync(path.resolve(options.root, "yarn.lock"));

      if (options.dev) {
        return choosePort(options.devHost, options.devAppPort)
          .then(appPort => {
            if (_.isNil(appPort)) {
              throw new Error("Could not start because we could not find a port for app server.");
            }

            options.devAppPort = appPort;
            process.env.PORT = appPort;

            return choosePort(options.devHost, options.devWebpackPort)
              .then(webpackPort => {
                if (_.isNil(webpackPort)) {
                  throw new Error("Could not start because we could not find a port for the webpack server.");
                }

                options.devWebpackPort = webpackPort;
                process.env.DEV_PORT = webpackPort;

                options.publicUrl = `http://${options.devHost}:${webpackPort}/`;
                options.devUrls_calculated = prepareUrls("http", options.devHost, webpackPort);

                return options;
              });
          });
      } else {
        return Promise.resolve(options);
      }
    }),
    map((options: BuildWebserverBuilderOptions) => {

      // Remove all content but keep the directory so that
      // if you're in it, you don't end up in Trash
      // only do this for development because in production we will use the
      // previous build output to measure the delta.
      if (options.dev) {
        fs.emptyDirSync(options.outputPath);
      }

      return options;
    }),
    switchMap((options: BuildWebserverBuilderOptions) => {
      if (!options.dev) {
        return measureFileSizesBeforeBuild(options.publicOutputFolder_calculated)
          .then((previousFileSizesForPublicFolder) =>
            [options, previousFileSizesForPublicFolder]);
      } else {
        return Promise.resolve([options, null]);
      }
    }),
    map(([options, previousFileSizesForPublicFolder]) => {

      if (!fs.existsSync(options.appHtml) ||
        !fs.existsSync(options.clientMain) ||
        !fs.existsSync(options.serverMain)) {
        throw new Error('One of appHtml, clientMain, or serverMain is not specified.');
      }

      let serverConfig = getServerConfig(options, context, true);
      if (options.serverWebpackConfig) {
        serverConfig = require(options.serverWebpackConfig)(serverConfig, {
          options,
          configuration: context.target.configuration
        });
      }

      let clientConfig = getClientConfig(options, context, false);
      if (options.clientWebpackConfig) {
        clientConfig = require(options.clientWebpackConfig)(clientConfig, {
          options,
          configuration: context.target.configuration
        });
      }

      return [options, serverConfig, clientConfig, previousFileSizesForPublicFolder];
    }),
    concatMap(([options, serverConfig, clientConfig, previousFileSizesForPublicFolder]:
                 [BuildWebserverBuilderOptions, Configuration, Configuration, object]) =>
      forkJoin(

        // compile the server
        iif(() => options.dev,

          // // this is for dev === true
          // of(new Promise((resolve, reject) => {
          //
          //
          //   const serverCompiler = createCompiler({
          //     webpack: webpack,
          //     config: serverConfig,
          //     appName: 'Server',
          //     useYarn: yarnExists,
          //     tscCompileOnError: true,
          //     useTypeScript: true,
          //     devSocket: devSocket,
          //     urls: options.devUrls_calculated
          //   });
          //
          //   // Start server in watch mode
          //   serverCompiler.watch(
          //     {
          //       quiet: true,
          //       stats: 'none',
          //     },
          //     () => {}
          //   );
          //
          //   // Open app in browser when server ready
          //   let serverStarted;
          //
          //   serverCompiler.plugin('done', () => {
          //     if (!serverStarted) {
          //       serverStarted = true;
          //       printInstructions(context.target.project, options.devUrls_calculated, yarnExists);
          //       setTimeout(() => {
          //         openBrowser(options.devUrls_calculated.localUrlForBrowser);
          //       }, 1000);
          //     }
          //   });
          // })),

          // this is for dev === true
          runWebpack(serverConfig, context, {
            logging: stats => {
              context.logger.info(stats.toString(serverConfig.stats));
            },
            webpackFactory: (config: Configuration) => of(createCompiler({
              webpack: webpack,
              config: serverConfig,
              appName: 'Server',
              useYarn: yarnExists,
              tscCompileOnError: true,
              useTypeScript: true,
              devSocket: devSocket,
              urls: options.devUrls_calculated
            }))
          }),

          // this is for dev === false
          runWebpack(serverConfig, context, {
            logging: stats => {
              context.logger.info(stats.toString(serverConfig.stats));
            }
          })
        ),

        // compile the client
        iif(() => options.dev,

          // this is for dev === true
          runWebpackDevServer(clientConfig, context, {
              logging: stats => {
                context.logger.info(stats.toString(clientConfig.stats));
              },
              devServerConfig: createWebpackServerOptions(options),
              webpackFactory: (config: webpack.Configuration) => of(createCompiler({
                webpack: webpack,
                config: clientConfig,
                appName: 'Client',
                useYarn: yarnExists,
                tscCompileOnError: true,
                useTypeScript: true,
                devSocket: devSocket,
                urls: options.devUrls_calculated
              }) as webpack.Compiler)
            }).pipe(
              map(output => {
                output.baseUrl = options.devUrls_calculated.localUrlForBrowser;
                return output;
              })
            ),

          runWebpack(clientConfig, context, {
            logging: stats => {
              context.logger.info(stats.toString(clientConfig.stats));

              if (!options.dev) {
                console.log(previousFileSizesForPublicFolder);
                context.logger.info('\n\nFile sizes of files in /public after gzip:\n');
                printFileSizesAfterBuild(
                  stats,
                  previousFileSizesForPublicFolder,
                  options.publicOutputFolder_calculated,
                  WARN_AFTER_BUNDLE_GZIP_SIZE,
                  WARN_AFTER_CHUNK_GZIP_SIZE
                );
              }
            }
          })
        ),

        of(options)
      )
    ),
    map(([serverBuildEvent, clientBuildEventOrDevServerBuildOutput, options]:
           [WebpackBuildEvent, WebpackBuildEvent, BuildWebserverBuilderOptions]) => {
      if (!options.dev) {
        serverBuildEvent.success = serverBuildEvent.success && clientBuildEventOrDevServerBuildOutput.success;
        serverBuildEvent.error = serverBuildEvent.error && clientBuildEventOrDevServerBuildOutput.error;
        serverBuildEvent.outfile = resolve(
          context.workspaceRoot,
          options.outputPath,
          OUT_FILENAME
        );
        return [serverBuildEvent as WebpackBuildEvent, options];
      } else {
        return [clientBuildEventOrDevServerBuildOutput, options];
      }
    }),
    map(([clientBuildEventOrDevServerBuildOutput, options]: [WebpackBuildEvent, BuildWebserverBuilderOptions]) => {
      // we only consider server external dependencies and libraries because it is the server
      // code that is run by node, not the browser code. It is expected that any
      // clientExternalDependencies and clientExternalLibraries are fetched in the browser separately.

      if (!options.dev) {
        writePackageJson(options, context, options.serverExternalDependencies, options.serverExternalLibraries);

        printHostingInstructions(options.publicUrl, options.publicOutputFolder_calculated, options.outputPath);

        return clientBuildEventOrDevServerBuildOutput;
      } else {
        console.log(`The public URL is ${options.publicUrl}`);
        return clientBuildEventOrDevServerBuildOutput;
      }
    })
  );
}


function printHostingInstructions(assetsPath, publicOutputFolder_calculated, buildFolder) {
  console.log(
    `\n\n\n\nThe project was built assuming all static assets are served from the path '${chalk.green(
      assetsPath
    )}'.`
  );
  console.log();
  if (assetsPath.startsWith('/')) {
    console.log(
      `All of your static assets will be served from the rendering server (specifically from ${chalk.green(publicOutputFolder_calculated)}).`
    );
    console.log('\nWe recommend serving static assets from a CDN in production.');
    console.log(
      `\nYou can control this with the ${chalk.cyan(
        'ASSETS_PATH'
      )} environment variable and set its value to the CDN URL.`
    );
    console.log();
  }
  console.log(`The ${chalk.cyan(buildFolder)} folder is ready to be deployed.`);
  console.log();
  console.log('You may run the app with node:');
  console.log();
  console.log(` ${chalk.cyan('node')} ${buildFolder}`);
  console.log();
}

function createWebpackServerOptions(options: BuildWebserverBuilderOptions) {
  return {
    disableHostCheck: true,
    // Enable gzip compression of generated files.
    compress: true,
    // Silence WebpackDevServer's own logs since they're generally not useful.
    // It will still show compile warnings and errors with this setting.
    clientLogLevel: 'none',
    // Enable hot reloading server. It will provide /sockjs-node/ endpoint
    // for the WebpackDevServer client so it can learn when the files were
    // updated. The WebpackDevServer client is included as an entry point
    // in the Webpack development configuration. Note that only changes
    // to CSS are currently hot reloaded. JS changes will refresh the browser.
    hot: true,
    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath: '/',
    // WebpackDevServer is noisy by default so we emit custom message instead
    // by listening to the compiler events with `compiler.hooks[...].tap` calls above.
    quiet: true,
    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebook/create-react-app/issues/293
    // src/node_modules is not ignored to support absolute imports
    // https://github.com/facebook/create-react-app/issues/1065
    watchOptions: {
      ignored: ignoredFiles(path.resolve(options.root, options.sourceRoot)),
    },
    host: options.devHost,
    port: options.devWebpackPort,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    overlay: false,
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true,
    },
    public: options.devUrls_calculated.lanUrlForConfig,
    before(app, server) {
      // This lets us fetch source contents from webpack for the error overlay
      app.use(evalSourceMapMiddleware(server));
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware());
    },
  };
};

function ignoredFiles(appSrc) {
  return new RegExp(
    `^(?!${escape(
      path.normalize(appSrc + '/').replace(/[\\]+/g, '/')
    )}).+/node_modules/`,
    'g'
  );
};
