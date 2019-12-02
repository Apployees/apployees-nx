/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { IBuildBuilderOptions, IFileReplacement } from "@apployees-nx/common-build-utils";
import _ from "lodash";
import { Stats } from "webpack";

export const extensions = [
  ".web.mjs",
  ".mjs",
  ".web.js",
  ".js",
  ".web.ts",
  ".ts",
  ".web.tsx",
  ".tsx",
  ".json",
  ".web.jsx",
  ".jsx",
];

export function getAliases(replacements: IFileReplacement[]): { [key: string]: string } {
  return _.extend(
    {},
    {
      // Support React Native Web
      // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
      "react-native": "react-native-web",
    },
    (replacements || []).reduce(
      (aliases, replacement) => ({
        ...aliases,
        [replacement.replace]: replacement.with,
      }),
      {},
    ),
  );
}

export function getStatsConfig(options: IBuildBuilderOptions): Stats.ToStringOptions {
  return {
    hash: true,
    timings: false,
    cached: false,
    cachedAssets: false,
    modules: false,
    warnings: true,
    errors: true,
    colors: !options.verbose && !options.statsJson,
    chunks: !options.verbose && !options.dev,
    assets: !!options.verbose,
    chunkOrigins: !!options.verbose,
    chunkModules: !!options.verbose,
    children: !!options.verbose,
    reasons: !!options.verbose,
    version: !!options.verbose,
    errorDetails: !!options.verbose,
    moduleTrace: !!options.verbose,
    usedExports: !!options.verbose,
  };
}

export const FILENAMES = {
  thirdPartyLicenses: `3rdpartylicenses.txt`,
  appHtml: `app.html`,
  manifestJson: `asset-manifest.json`,
  publicFolder: `public`,
};
