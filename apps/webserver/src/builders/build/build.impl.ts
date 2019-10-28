import path, { resolve } from "path";
import fs from "fs-extra";
import chalk from "chalk";
import { BuilderContext, createBuilder } from "@angular-devkit/architect";
import { JsonObject } from "@angular-devkit/core";
import { DevServerBuildOutput, runWebpack, runWebpackDevServer } from "@angular-devkit/build-webpack";
import { forkJoin, from, Observable, of } from "rxjs";
import { concatMap, map, switchMap } from "rxjs/operators";
import {
  getSourceRoot,
  loadEnvironmentVariables,
  OUT_FILENAME,
  WebpackBuildEvent,
  writePackageJson
} from "@apployees-nx/common-build-utils";
import { BuildWebserverBuilderOptions } from "../../utils/common/webserver-types";
import { normalizeBuildOptions } from "../../utils/common/normalize";
import { getServerConfig } from "../../utils/server/server-config";
import { getClientConfig } from "../../utils/client/client-config";
import { checkBrowsers } from "react-dev-utils/browsersHelper";
import FileSizeReporter from "react-dev-utils/FileSizeReporter";
import { choosePort, createCompiler, prepareUrls } from "react-dev-utils/WebpackDevServerUtils";
import errorOverlayMiddleware from "react-dev-utils/errorOverlayMiddleware";
import evalSourceMapMiddleware from "react-dev-utils/evalSourceMapMiddleware";
import _ from "lodash";
import webpack, { Configuration } from "webpack";
import escape from "escape-string-regexp";
import WebpackDevServer from "webpack-dev-server";
import noopServiceWorkerMiddleware from "react-dev-utils/noopServiceWorkerMiddleware";

const measureFileSizesBeforeBuild =
  FileSizeReporter.measureFileSizesBeforeBuild;
const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

const isInteractive = process.stdout.isTTY;

try {
  require("dotenv").config();
} catch (e) {
}

export default createBuilder<JsonObject & BuildWebserverBuilderOptions>(run);

interface WebpackDevServerReference {
  server: WebpackDevServer & {sockWrite: Function, sockets: any};
}

function run(
  options: JsonObject & BuildWebserverBuilderOptions,
  context: BuilderContext
): Observable<WebpackBuildEvent> {

  const nodeEnv: string = options.dev ? "development" : "production";
  // do this otherwise our bootstrapped @apployees-nx/node actually replaces this
  // to "development" or "production" at build time.
  const nodeEnvKey = "NODE_ENV";
  const babelEnvKey = "BABEL_ENV";
  process.env[nodeEnvKey] = nodeEnv;
  process.env[babelEnvKey] = nodeEnv;

  const devServer: WebpackDevServerReference = { server: null };
  const devSocket = {
    warnings: warnings => {
      devServer.server.sockWrite(devServer.server.sockets, "warnings", warnings);
    },
    errors: errors => {
      devServer.server.sockWrite(devServer.server.sockets, "errors", errors);
    }
  };
  let yarnExists;

  return from(getSourceRoot(context)).pipe(
    map(sourceRoot =>
      normalizeBuildOptions(options, context, sourceRoot)
    ),
    switchMap((options: BuildWebserverBuilderOptions) =>
      checkBrowsers(path.resolve(options.root, options.sourceRoot), isInteractive)
        .then(() => options)),
    switchMap((options: BuildWebserverBuilderOptions) => {

      yarnExists = fs.existsSync(path.resolve(options.root, "yarn.lock"));
      loadEnvironmentVariables(options, context);

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
                const protocol = options.devHttps ? 'https' : 'http';

                options.assetsUrl = `${protocol}://${options.devHost}:${webpackPort}/`;
                options.devUrls_calculated = prepareUrls(protocol, options.devHost, appPort);

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
        throw new Error("One of appHtml, clientMain, or serverMain is not specified.");
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
                 [BuildWebserverBuilderOptions, Configuration, Configuration, object]) => {

        if (options.dev) {
          return forkJoin(
            runWebpack(serverConfig, context, {
              logging: stats => {
                context.logger.info(stats.toString(serverConfig.stats));
              },
              webpackFactory: (config: Configuration) => of(createCompiler({
                webpack: webpack,
                config: serverConfig,
                appName: context.target.project + " - Server",
                useYarn: yarnExists,
                tscCompileOnError: true,
                useTypeScript: true,
                devSocket: devSocket,
                urls: options.devUrls_calculated
              }))
            }),

            runWebpackDevServer(clientConfig, context, {
              logging: stats => {
                context.logger.info(stats.toString(clientConfig.stats));
              },
              devServerConfig: createWebpackServerOptions(options, context, devServer),
              webpackFactory: (config: webpack.Configuration) => of(createCompiler({
                webpack: webpack,
                config: clientConfig,
                appName: context.target.project + " - Client",
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

            of(options)
          );
        } else {
          return forkJoin(
            runWebpack(serverConfig, context, {
              logging: stats => {
                context.logger.info(stats.toString(serverConfig.stats));
              }
            }),

            runWebpack(clientConfig, context, {
              logging: stats => {
                context.logger.info(stats.toString(clientConfig.stats));

                console.log(previousFileSizesForPublicFolder);
                context.logger.info("\n\nFile sizes of files in /public after gzip:\n");
                printFileSizesAfterBuild(
                  stats,
                  previousFileSizesForPublicFolder,
                  options.publicOutputFolder_calculated,
                  WARN_AFTER_BUNDLE_GZIP_SIZE,
                  WARN_AFTER_CHUNK_GZIP_SIZE
                );
              }
            }),

            of(options)
          );
        }
      }
    ),
    map(([serverBuildEvent, clientBuildEventOrDevServerBuildOutput, options]:
           [WebpackBuildEvent, WebpackBuildEvent | DevServerBuildOutput, BuildWebserverBuilderOptions]) => {
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
        return [clientBuildEventOrDevServerBuildOutput as DevServerBuildOutput, options];
      }
    }),
    map(([clientBuildEventOrDevServerBuildOutput, options]:
           [WebpackBuildEvent & DevServerBuildOutput, BuildWebserverBuilderOptions]) => {
      // we only consider server external dependencies and libraries because it is the server
      // code that is run by node, not the browser code.

      if (!options.dev) {
        writePackageJson(options, context, options.serverExternalDependencies, options.serverExternalLibraries);

        printHostingInstructions(options);

        return clientBuildEventOrDevServerBuildOutput;
      } else {
        return clientBuildEventOrDevServerBuildOutput;
      }
    })
  );
}


function printHostingInstructions(options: BuildWebserverBuilderOptions) {
  const assetsPath = options.assetsUrl;
  const publicOutputFolder_calculated = options.publicOutputFolder_calculated;
  const buildFolder = options.outputPath;

  console.log(
    `\n\n\n\nThe project was built assuming all static assets are served from the path '${chalk.green(
      assetsPath
    )}'.`
  );
  console.log();
  if (assetsPath.startsWith("/")) {
    console.log(
      `All of your static assets will be served from the rendering server (specifically from ${chalk.green(publicOutputFolder_calculated)}).`
    );
    console.log("\nWe recommend serving static assets from a CDN in production.");
    console.log(
      `\nYou can control this with the ${chalk.cyan(
        "ASSETS_URL"
      )} environment variable and set its value to the CDN URL for your next build.`
    );
    console.log();
  }
  console.log(`The ${chalk.cyan(buildFolder)} folder is ready to be deployed.`);
  console.log();
  console.log("You may run the app with node:");
  console.log();
  console.log(` ${chalk.cyan("node")} ${buildFolder}`);
  console.log();
}

function createWebpackServerOptions(options: BuildWebserverBuilderOptions,
                                    context: BuilderContext,
                                    serverReference: WebpackDevServerReference) {
  const config: WebpackDevServer.Configuration = {
    // this needs to remain disabled because our webpackdevserver runs on a
    // different port than the server app.
    disableHostCheck: true,
    // Enable gzip compression of generated files.
    compress: true,
    // Silence WebpackDevServer's own logs since they're generally not useful.
    // It will still show compile warnings and errors with this setting.
    clientLogLevel: "none",
    // Enable hot reloading server. It will provide /sockjs-node/ endpoint
    // for the WebpackDevServer client so it can learn when the files were
    // updated. The WebpackDevServer client is included as an entry point
    // in the Webpack development configuration. Note that only changes
    // to CSS are currently hot reloaded. JS changes will refresh the browser.
    hot: true,
    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath: process.env.ASSETS_URL || options.assetsUrl,
    // WebpackDevServer is noisy by default so we emit custom message instead
    // by listening to the compiler events with `compiler.hooks[...].tap` calls above.
    quiet: true,
    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebook/create-react-app/issues/293
    // src/node_modules is not ignored to support absolute imports
    // https://github.com/facebook/create-react-app/issues/1065
    watchOptions: {
      ignored: ignoredFiles(path.resolve(options.root, options.sourceRoot))
    },
    host: options.devHost,
    port: options.devWebpackPort,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    overlay: false,
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true
    },
    public: options.devUrls_calculated.lanUrlForConfig,
    https: options.devHttps,
    before(app, server) {
      serverReference.server = server as any;

      // This lets us fetch source contents from webpack for the error overlay
      app.use(evalSourceMapMiddleware(server));
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware());

      // This service worker file is effectively a 'no-op' that will reset any
      // previous service worker registered for the same host:port combination.
      // We do this in development to avoid hitting the production cache if
      // it used the same host and port.
      // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
      app.use(noopServiceWorkerMiddleware());
    }
  };

  return config;
}

function ignoredFiles(appSrc) {
  return new RegExp(
    `^(?!${escape(
      path.normalize(appSrc + "/").replace(/[\\]+/g, "/")
    )}).+/node_modules/`,
    "g"
  );
}
