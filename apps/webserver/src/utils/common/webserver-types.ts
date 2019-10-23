import {
  BuildBuilderOptions,
  ExternalDependencies,
  FileReplacement,
  InspectType
} from '@apployees-nx/common-build-utils';

export interface BuildWebserverBuilderOptions extends BuildBuilderOptions {
  devHost?: string;
  devAppPort?: number;
  devHttps?: boolean;
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
  optimization?: boolean;
  sourceMap?: boolean;
  outputHashing?: "none" | "all" | "media" | "bundles";
  imageInlineSizeLimit?: number;
  assetsUrl?: string;
  publicOutputFolder_calculated?: string;
  inlineRuntimeChunk?: boolean;
  serverExternalDependencies?: ExternalDependencies;
  serverExternalLibraries?: ExternalDependencies;
  clientExternalDependencies?: ExternalDependencies;
  clientExternalLibraries?: ExternalDependencies;
  serverFileReplacements: FileReplacement[];
  clientFileReplacements: FileReplacement[];
  serverWebpackConfig?: string;
  clientWebpackConfig?: string;
  inspect?: boolean | InspectType;
  inspectHost?: string;
  inspectPort?: number;
}
