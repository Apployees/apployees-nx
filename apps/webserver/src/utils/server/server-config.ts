import webpack, { Configuration, ProgressPlugin } from "webpack";
import path, { dirname } from "path";
import { LicenseWebpackPlugin } from "license-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { BuildWebserverBuilderOptions } from "../common/webserver-types";
import _ from "lodash";
import { BuilderContext } from "@angular-devkit/architect";
import { getBaseLoaders } from "../common/common-loaders";
import { getAssetsUrl } from "../common/env";
import { getPlugins } from "../common/plugins";
import { extensions, getAliases, getStatsConfig } from "../common/common-config";
import { getServerLoaders } from "./server-loaders";
import { getNodeExternals, InspectType } from "@apployees-nx/common-build-utils";
import { appRootPath } from "@nrwl/workspace/src/utils/app-root";
import CircularDependencyPlugin from "circular-dependency-plugin";
import PnpWebpackPlugin from "pnp-webpack-plugin";
import StartServerPlugin from "start-server-webpack-plugin";

export function getServerConfig(
  options: BuildWebserverBuilderOptions,
  context: BuilderContext,
  esm?: boolean
): Configuration {

  const mainFields = [...(esm ? ['es2015'] : []), 'module', 'main'];
  const isEnvDevelopment = options.dev;
  const isEnvProduction = !options.dev;
  const shouldUseSourceMap = options.sourceMap;
  const publicPath = getAssetsUrl(options);
  const nodeArgs = ['-r', 'source-map-support/register'];

  if (options.inspect === true) {
    options.inspect = InspectType.Inspect;
  }
  if (options.inspect) {
    nodeArgs.push(`--${options.inspect}=${options.inspectHost}:${options.inspectPort}`);
  }

  const webpackConfig: Configuration = {
    name: 'server',
    target: 'node',
    watch: isEnvDevelopment,
    mode: isEnvProduction ? 'production' : 'development',
    // Stop compilation early in production
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? 'source-map'
        : false
      : 'eval-source-map',
    entry: [
      isEnvDevelopment && 'webpack/hot/poll?100',
      options.serverMain
    ].filter(Boolean),
    externals: getNodeExternals(
      options.serverExternalLibraries,
      options.serverExternalDependencies,
      [
        isEnvDevelopment && 'webpack/hot/poll?100',
        /\.(eot|woff|woff2|ttf|otf)$/,
        /\.(svg|png|jpg|jpeg|gif|ico)$/,
        /\.(mp4|mp3|ogg|swf|webp)$/,
        /\.(css|scss|sass|sss|less)$/
      ]
    ),
    output: {
      path: options.outputPath,
      publicPath: publicPath,
      filename: 'index.js',
      libraryTarget: 'commonjs2',
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isEnvProduction
        ? info =>
          path
            .relative(path.resolve(options.root, options.sourceRoot), info.absoluteResourcePath)
            .replace(/\\/g, '/')
        : isEnvDevelopment &&
        (info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'))
    },
    resolve: {
      modules: ['node_modules', `${appRootPath}/node_modules`],
      extensions,
      alias: _.extend({},
        {
          '@': path.resolve(__dirname),
          '~': path.resolve(__dirname),
          // This is required so symlinks work during development.
          'webpack/hot/poll': require.resolve(`webpack/hot/poll`)
        },
        getAliases(options.serverFileReplacements)
      ),
      plugins: [
        new TsConfigPathsPlugin({
          configFile: options.tsConfig,
          extensions,
          mainFields
        }),
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin
      ],
      mainFields
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module)
      ]
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
          true // isEnvServer
        ),
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: getServerLoaders(options)
        }
      ]
    },
    plugins: [
      ...getPlugins(options, context, false),
      isEnvDevelopment &&
      new StartServerPlugin({
        name: 'index.js',
        nodeArgs
      }),
      isEnvDevelopment && new webpack.WatchIgnorePlugin([options.publicOutputFolder_calculated])
    ].filter(Boolean),
    node: {
      __console: false,
      __dirname: false,
      __filename: false
    },
    stats: getStatsConfig(options),
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
    optimization: {
      // see https://github.com/webpack/webpack/issues/7128
      namedModules: false
    }
  };

  const extraPlugins: webpack.Plugin[] = [];

  if (options.progress && isEnvDevelopment) {
    extraPlugins.push(new ProgressPlugin());
  }

  if (options.extractLicenses) {
    extraPlugins.push(
      new LicenseWebpackPlugin({
        pattern: /.*/,
        suppressErrors: true,
        perChunkOutput: false,
        outputFilename: `3rdpartylicenses.txt`
      })
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
          dot: true
        }
      };
    });

    const copyWebpackPluginOptions = {
      ignore: ['.gitkeep', '**/.DS_Store', '**/Thumbs.db']
    };

    const copyWebpackPluginInstance = new CopyWebpackPlugin(
      copyWebpackPluginPatterns,
      copyWebpackPluginOptions
    );
    extraPlugins.push(copyWebpackPluginInstance);
  }

  if (options.showCircularDependencies) {
    extraPlugins.push(
      new CircularDependencyPlugin({
        exclude: /[\\\/]node_modules[\\\/]/
      })
    );
  }

  webpackConfig.plugins = [...webpackConfig.plugins, ...extraPlugins];

  return webpackConfig;
}
