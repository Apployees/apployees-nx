/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
export interface IImportTransformerOptions {
  libraryName: string;
  subdirectory?: string;
  transformCamel2Dash?: boolean;
  transformCamel2Underline?: boolean;
  useDefaultImports?: boolean;
  additionalImports?: { [importName: string]: string[] };
}
