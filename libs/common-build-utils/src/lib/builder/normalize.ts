/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import * as _ from "lodash";
import { basename, dirname, relative, resolve } from "path";
import { normalize } from "@angular-devkit/core";
import { statSync } from "fs";
import { IFileReplacement } from "../types/common-types";

export function normalizeOtherEntries(root: string, otherEntries: object): object {
  const _ret = otherEntries || {};
  _.forEach(otherEntries, (value, key) => {
    _ret[key] = resolve(root, value);
  });

  return _ret;
}

export function normalizeAssets(assets: any[], root: string, sourceRoot: string): any[] {
  return assets.map(asset => {
    if (typeof asset === "string") {
      const assetPath = normalize(asset);
      const resolvedAssetPath = resolve(root, assetPath);
      const resolvedSourceRoot = resolve(root, sourceRoot);

      const isDirectory = statSync(resolvedAssetPath).isDirectory();
      const input = isDirectory ? resolvedAssetPath : dirname(resolvedAssetPath);
      const output = relative(resolvedSourceRoot, resolve(root, input));
      const glob = isDirectory ? "**/*" : basename(resolvedAssetPath);
      return {
        input,
        output,
        glob,
      };
    } else {
      if (asset.output.startsWith("..")) {
        throw new Error("An asset cannot be written to a location outside of the output path.");
      }

      const assetPath = normalize(asset.input);
      const resolvedAssetPath = resolve(root, assetPath);
      return {
        ...asset,
        input: resolvedAssetPath,
        // Now we remove starting slash to make Webpack place it from the output root.
        output: asset.output.replace(/^\//, ""),
      };
    }
  });
}

export function normalizeFileReplacements(root: string, fileReplacements: IFileReplacement[]): IFileReplacement[] {
  return fileReplacements.map(fileReplacement => ({
    replace: resolve(root, fileReplacement.replace),
    with: resolve(root, fileReplacement.with),
  }));
}
