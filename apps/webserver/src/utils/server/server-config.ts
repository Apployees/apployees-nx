/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import "source-map-support";
import webpack, { Configuration } from "webpack";
import path, { dirname } from "path";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { IBuildWebserverBuilderOptions } from "../common/webserver-types";
import _ from "lodash";
import { BuilderContext } from "@angular-devkit/architect";
import { getBaseLoaders } from "../common/common-loaders";
import { getPlugins } from "../common/plugins";
import { extensions, FILENAMES, getAliases, getStatsConfig } from "../common/common-config";
import { getServerLoaders } from "./server-loaders";
import { getNodeExternals, InspectType } from "@apployees-nx/common-build-utils";
import { appRootPath } from "@nrwl/workspace/src/utils/app-root";
import CircularDependencyPlugin from "circular-dependency-plugin";
import PnpWebpackPlugin from "pnp-webpack-plugin";
import StartServerPlugin from "start-server-webpack-plugin";
import WebpackBar from "webpackbar";
import WorkerPlugin from "worker-plugin";
import ThreadsPlugin from "threads-plugin";
import "tiny-worker";

export function getServerConfig(
  options: IBuildWebserverBuilderOptions,
  context: BuilderContext,
  esm?: boolean,
): Configuration {
  const mainFields = [...(esm ? ["es2015"] : []), "module", "main"];
  const isEnvDevelopment = options.dev;
  const isEnvProduction = !options.dev;
  const shouldUseSourceMap = options.sourceMap;
  const nodeArgs = ["-r", "source-map-support/register"];

  if (options.inspect === true) {
    options.inspect = InspectType.Inspect;
  }
  if (options.inspect) {
    nodeArgs.push(`--${options.inspect}=${options.inspectHost}:${options.inspectPort}`);
  }

  let devTool;
  if (isEnvProduction) {
    if (shouldUseSourceMap) {
      devTool = "source-map";
    } else {
      devTool = false;
    }
  } else {
    // don't merge the logic into a single if condition because we want to test out different source maps for
    // dev and prod builds in the future.
    devTool = "inline-source-map";
  }

  const webpackConfig: Configuration = {
    name: "server",
    target: "node",
    watch: isEnvDevelopment,
    mode: isEnvProduction ? "production" : "development",
    // Stop compilation early in production
    bail: isEnvProduction,
    devtool: devTool,
    entry: [isEnvDevelopment && "webpack/hot/poll?100", options.serverMain].filter(Boolean),
    externals: getNodeExternals(options.serverExternalLibraries, options.serverExternalDependencies, [
      isEnvDevelopment && "webpack/hot/poll?100",
      /\.(eot|woff|woff2|ttf|otf)$/,
      /\.(svg|png|jpg|jpeg|gif|ico)$/,
      /\.(mp4|mp3|ogg|swf|webp)$/,
      /\.(css|scss|sass|sss|less)$/,
    ]),
    output: {
      path: options.outputPath,
      filename: "index.js",
      libraryTarget: "commonjs2",
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isEnvProduction
        ? (info) =>
            path.relative(path.resolve(options.root, options.sourceRoot), info.absoluteResourcePath).replace(/\\/g, "/")
        : isEnvDevelopment && ((info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, "/")),
    },
    resolve: {
      modules: ["node_modules", `${appRootPath}/node_modules`],
      extensions,
      alias: _.extend(
        {},
        {
          "@": path.resolve(__dirname),
          "~": path.resolve(__dirname),
          // This is required so symlinks work during development.
          "webpack/hot/poll": _.isString(require.resolve(`webpack/hot/poll`))
            ? require.resolve(`webpack/hot/poll`)
            : `webpack/hot/poll`,
        },
        getAliases(options.serverFileReplacements),
      ),
      plugins: [
        new TsConfigPathsPlugin({
          configFile: options.tsConfig,
          extensions,
          mainFields,
        }),
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
      ],
      mainFields,
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },
    module: {
      strictExportPresence: true,
      rules: [
        ...getBaseLoaders(
          options,
          dirname(options.serverMain),
          esm,
          options.verbose,
          isEnvDevelopment,
          true, // isEnvServer
        ),
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: getServerLoaders(options),
        },
      ],
    },
    plugins: [
      ...getPlugins(options, context, false),
      isEnvDevelopment &&
        new StartServerPlugin({
          name: "index.js",
          signal: false,
          nodeArgs,
        }),
      isEnvDevelopment && new webpack.WatchIgnorePlugin([options.publicOutputFolder_calculated]),
    ].filter(Boolean),
    node: {
      __console: false,
      __dirname: false,
      __filename: false,
    },
    stats: getStatsConfig(options),
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
    optimization: {
      // see https://github.com/webpack/webpack/issues/7128
      namedModules: false,
    },
  };

  const extraPlugins: webpack.Plugin[] = [];

  if (options.progress) {
    extraPlugins.push(
      new WebpackBar({
        name: "server",
        fancy: isEnvDevelopment,
        basic: !isEnvDevelopment,
      }),
    );
  }

  if (options.extractLicenses) {
    extraPlugins.push(
      new LicenseWebpackPlugin({
        pattern: /.*/,
        suppressErrors: true,
        perChunkOutput: false,
        outputFilename: `3rdpartylicenses.txt`,
      }),
    );
  }

  // process asset entries
  if (options.assets) {
    const copyWebpackPluginPatterns = options.assets.map((asset: any) => {
      return {
        context: asset.input,
        // Now we remove starting slash to make Webpack place it from the output root.
        to: asset.output,
        ignore: asset.ignore,
        from: {
          glob: asset.glob,
          dot: true,
        },
      };
    });

    const copyWebpackPluginOptions = {
      ignore: [
        ".gitkeep",
        "**/.DS_Store",
        "**/Thumbs.db",
        // don't overwrite the files we generated ourselves for the client
        ..._.values(FILENAMES).filter((fileName) => fileName !== FILENAMES.publicFolder),
      ],
    };

    const copyWebpackPluginInstance = new CopyWebpackPlugin(copyWebpackPluginPatterns, copyWebpackPluginOptions);
    extraPlugins.push(copyWebpackPluginInstance);
  }

  if (options.showCircularDependencies) {
    extraPlugins.push(
      new CircularDependencyPlugin({
        // eslint-disable-next-line no-useless-escape
        exclude: /[\\\/]node_modules[\\\/]/,
      }),
    );
  }

  const plugins = [...webpackConfig.plugins, ...extraPlugins];

  webpackConfig.plugins = [
    options.useThreadsPlugin
      ? new ThreadsPlugin({
          globalObject: "self",
          // this includes hard source as well, but we just want the DefinePlugin
          // Needs further investigation
          // plugins: plugins,
        })
      : new WorkerPlugin(),
    ...plugins,
  ];

  return webpackConfig;
}
