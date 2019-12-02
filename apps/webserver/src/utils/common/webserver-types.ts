/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import {
  IBuildBuilderOptions,
  ExternalDependencies,
  IFileReplacement,
  InspectType,
} from "@apployees-nx/common-build-utils";
import { IImportTransformerOptions } from "./import-transformer-options";

export interface IBuildWebserverBuilderOptions extends IBuildBuilderOptions {
  devHost?: string;
  devAppPort?: number;
  devHttps?: boolean;
  devHttpsSslKey?: string;
  devHttpsSslCert?: string;
  devWebpackPort?: number;
  devUrls_calculated?: {
    lanUrlForConfig;
    lanUrlForTerminal;
    localUrlForTerminal;
    localUrlForBrowser;
  };
  appHtml: string;
  serverMain: string;
  clientMain: string;
  clientOtherEntries?: object;
  sourceMap?: boolean;
  outputHashing?: "none" | "all" | "media" | "bundles";
  imageInlineSizeLimit?: number;
  assetsUrl?: string;
  publicUrl?: string;
  favicon?: string;
  manifestJson?: string;
  publicOutputFolder_calculated?: string;
  inlineRuntimeChunk?: boolean;
  serverExternalDependencies?: ExternalDependencies;
  serverExternalLibraries?: ExternalDependencies;
  serverFileReplacements: IFileReplacement[];
  clientFileReplacements: IFileReplacement[];
  lessStyleVariables?: string;
  lessStyleVariables_calculated?: object;
  serverWebpackConfig?: string;
  clientWebpackConfig?: string;
  inspect?: boolean | InspectType;
  inspectHost?: string;
  inspectPort?: number;
  devClientBundleAnalyzer?: boolean;
  importTransformers: IImportTransformerOptions[];
}
