/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/

import * as ts from "typescript";
import { join as pathJoin, sep } from "path";
import { IImportTransformerOptions } from "./import-transformer-options";
import _ from "lodash";

export interface IImportedStruct {
  importName: string;
  variableName?: string;
}

function join(...params: string[]) {
  /* istanbul ignore if  */
  if (sep === "\\") {
    const ret = pathJoin(...params);
    return ret.replace(/\\/g, "/");
  }
  /* istanbul ignore next  */
  return pathJoin(...params);
}

// camel2Dash camel2Underline
// borrow from https://github.com/ant-design/babel-plugin-import
function camel2Dash(_str: string) {
  const str = _str[0].toLowerCase() + _str.substr(1);
  return str.replace(/([A-Z])/g, $1 => `-${$1.toLowerCase()}`);
}

function camel2Underline(_str: string) {
  const str = _str[0].toLowerCase() + _str.substr(1);
  return str.replace(/([A-Z])/g, $1 => `_${$1.toLowerCase()}`);
}

function getImportedStructs(node: ts.Node) {
  const structs = new Set<IImportedStruct>();
  node.forEachChild(importChild => {
    if (!ts.isImportClause(importChild)) {
      return;
    }

    // not allow default import, or mixed default and named import
    // e.g. import foo from 'bar'
    // e.g. import foo, { bar as baz } from 'x'
    // and must namedBindings exist
    if (importChild.name || !importChild.namedBindings) {
      return;
    }

    // not allow namespace import
    // e.g. import * as _ from 'lodash'
    if (!ts.isNamedImports(importChild.namedBindings)) {
      return;
    }

    importChild.namedBindings.forEachChild(namedBinding => {
      // ts.NamedImports.elements will always be ts.ImportSpecifier
      const importSpecifier = namedBinding as ts.ImportSpecifier;

      // import { foo } from 'bar'
      if (!importSpecifier.propertyName) {
        structs.add({ importName: importSpecifier.name.text });
        return;
      }

      // import { foo as bar } from 'baz'
      structs.add({
        importName: importSpecifier.propertyName.text,
        variableName: importSpecifier.name.text,
      });
    });
  });
  return structs;
}

function createDistAst(struct: IImportedStruct, options: IImportTransformerOptions) {
  const astNodes: ts.Node[] = [];

  const { libraryName } = options;
  const _importName = struct.importName;
  const importName = options.transformCamel2Underline
    ? camel2Underline(_importName)
    : options.transformCamel2Dash
    ? camel2Dash(_importName)
    : _importName;

  const subdirectory = join(options.subdirectory || "", importName);

  const importPath = join(libraryName!, subdirectory);
  try {
    const scriptNode = ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        struct.variableName || !options.useDefaultImports ? undefined : ts.createIdentifier(struct.importName),
        struct.variableName
          ? ts.createNamedImports([
              ts.createImportSpecifier(
                options.useDefaultImports ? ts.createIdentifier("default") : ts.createIdentifier(struct.importName),
                ts.createIdentifier(struct.variableName),
              ),
            ])
          : options.useDefaultImports
          ? undefined
          : ts.createNamedImports([ts.createImportSpecifier(undefined, ts.createIdentifier(struct.importName))]),
      ),
      ts.createLiteral(importPath),
    );

    astNodes.push(scriptNode);

    const additionalImportsContainer = options.additionalImports || {};
    let additionalImports = additionalImportsContainer[importName];

    // we don't want to do x || y || z because the array may be intentionally empty.
    if (_.isNil(additionalImports)) {
      additionalImports = additionalImportsContainer[_importName];
      if (_.isNil(additionalImports)) {
        additionalImports = additionalImportsContainer["*"];
      }
    }

    if (additionalImports && additionalImports.length > 0) {
      for (const additionalImport of additionalImports) {
        const additionalImportPath = `${importPath}/${additionalImport}`;

        if (additionalImportPath) {
          const styleNode = ts.createImportDeclaration(
            undefined,
            undefined,
            undefined,
            ts.createLiteral(additionalImportPath),
          );
          astNodes.push(styleNode);
        }
      }
    }
    // tslint:disable-next-line:no-empty
  } catch (e) {
    astNodes.push(
      ts.createImportDeclaration(
        undefined,
        undefined,
        ts.createImportClause(
          undefined,
          ts.createNamedImports([ts.createImportSpecifier(undefined, ts.createIdentifier(_importName))]),
        ),
        ts.createLiteral(libraryName!),
      ),
    );
  }
  return astNodes;
}

export function importTransformer(_options: Array<IImportTransformerOptions>) {
  const transformer: ts.TransformerFactory<ts.SourceFile> = context => {
    const visitor: ts.Visitor = node => {
      if (ts.isSourceFile(node)) {
        return ts.visitEachChild(node, visitor, context);
      }

      if (!ts.isImportDeclaration(node)) {
        return node;
      }

      const importedLibName = (node.moduleSpecifier as ts.StringLiteral).text;

      const options = _options.find(_ => _.libraryName === importedLibName);

      if (!options) {
        return node;
      }

      const structs = getImportedStructs(node);
      if (structs.size === 0) {
        return node;
      }

      return Array.from(structs).reduce(
        (acc, struct) => {
          const nodes = createDistAst(struct, options);
          return acc.concat(nodes);
        },
        [] as ts.Node[],
      );
    };

    return node => ts.visitNode(node, visitor);
  };
  return transformer;
}
