export interface ImportTransformerOptions {
  libraryName: string;
  subdirectory?: string;
  transformCamel2Dash?: boolean;
  transformCamel2Underline?: boolean;
  useDefaultImports?: boolean;
  additionalImports?: {[importName: string]: string[]};
}
