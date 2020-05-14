/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from "fs";
import {appRootPath} from "@nrwl/workspace/src/utils/app-root";
import {directoryExists, fileExists} from "@nrwl/workspace/src/utils/fileutils";
import {readJsonFile} from "@angular-devkit/schematics/tools/file-system-utility";
import * as path from "path";
import * as ts from "typescript";
import {output, readWorkspaceJson} from "@nrwl/workspace";
import {BuilderContext} from "@angular-devkit/architect";
import {getExternalizedLibraryImports} from "../node-externals/externalized-imports";
import * as _ from "lodash";
import * as stringify from "json-stable-stringify";
import {ExternalDependencies} from "../types/common-types";
import {readRootPackageJson} from "../builder/sources";
import {ProjectGraphNode} from "@nrwl/workspace/src/core/project-graph";
import {FileData, normalizedProjectRoot} from "@nrwl/workspace/src/core/file-utils";

/**
 * Package name to version number to be used in package.json files.
 */
export type PackageJsonDependencies = {
  [packageName: string]: string;
};

export type IPackageJson = {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  bugs?: string;
  homepage?: string;
  keywords?: string;
  repository?: string;
  license?: string;
  private?: boolean;
  dependencies?: PackageJsonDependencies;
  devDependencies?: PackageJsonDependencies;
  peerDependencies?: PackageJsonDependencies;
  optionalDependencies?: PackageJsonDependencies;
};

export function doWritePackageJson(
  npmScope: string,
  projectGraphNode: ProjectGraphNode,
  allProjectGraphNodes: ProjectGraphNode[],
  context: BuilderContext,
  externalDependencies: ExternalDependencies,
  externalLibraries: ExternalDependencies,
): void {
  // first read the workspace json and get the roots and build targets in architect
  const workspaceJson = readWorkspaceJson();

  const project = {
    graph: projectGraphNode,
    root: workspaceJson.projects[projectGraphNode.name].root,
    architect: workspaceJson.projects[projectGraphNode.name].architect,
  } as IProjectNode;

  const allProjects: IProjectNode[] = _.reduce(
    allProjectGraphNodes,
    (agg, graphNode) => {
      if ((graphNode.type === "app" || graphNode.type === "lib") &&
          workspaceJson.projects[graphNode.name]) {
        agg.push({
          graph: graphNode,
          root: workspaceJson.projects[graphNode.name].root,
          architect: workspaceJson.projects[graphNode.name].architect,
        } as IProjectNode);
      }

      return agg;
    },
    [],
  );

  const projectOutputPath = getProjectOutputPath(project, context);
  const distPackageJsonPath = `${projectOutputPath}/package.json`;
  if (!directoryExists(projectOutputPath)) {
    console.log(`Trying to mkdirSync ${projectOutputPath}`);
    mkdirSync(projectOutputPath);
  }
  const existingBuiltPackageJson: IPackageJson = fileExists(distPackageJsonPath)
    ? (readJsonFile(distPackageJsonPath) as IPackageJson)
    : null;

  if (!existingBuiltPackageJson) {
    const rootPackageJson = readRootPackageJson();

    const isLibraryExternalized = getExternalizedLibraryImports(externalLibraries, npmScope);

    const calculator = new DepsCalculator(
      npmScope,
      project,
      allProjects,
      (f: string) => readFileSync(`${appRootPath}/${f}`, "UTF-8"),
      context,
      rootPackageJson,
      externalDependencies,
      isLibraryExternalized,
      {},
    );

    writePackageJsonSync(calculator.generatePackageJson(), distPackageJsonPath);

    // also copy over any yarn.lock or package-lock.json file if they exist in the root directory
    const rootYarnLockFilePath = `${appRootPath}/yarn.lock`;
    if (fileExists(rootYarnLockFilePath)) {
      const distYarnLockFilePath = `${projectOutputPath}/yarn.lock`;
      copyFileSync(rootYarnLockFilePath, distYarnLockFilePath);
    }
    const rootPackageLockLockFilePath = `${appRootPath}/package-lock.json`;
    if (fileExists(rootPackageLockLockFilePath)) {
      const distPackageLockLockFilePath = `${projectOutputPath}/package-lock.json`;
      copyFileSync(rootPackageLockLockFilePath, distPackageLockLockFilePath);
    }
  }
}

function getProjectOutputPath(project: IProjectNode, context: BuilderContext): string {
  let outputPath;
  const target = context.target.target;
  if (project.architect[target].options) {
    outputPath = path.normalize(`${appRootPath}/${project.architect[target].options.outputPath}`);
  }

  if (!outputPath) {
    outputPath = path.normalize(`${appRootPath}/dist/${project.root}`);
  }

  return outputPath;
}

function writePackageJsonSync(packageJson: IPackageJson, filePath: string): void {
  writeFileSync(
    filePath,
    stringify(packageJson, {
      space: "  ",
      cmp: (a, b) => {
        if (a.key === "name") {
          return -1;
        } else if (b.key === "name") {
          return 1;
        } else if (a.key === "version") {
          return -1;
        } else if (b.key === "version") {
          return 1;
        } else if (a.key === "description") {
          return -1;
        } else if (b.key === "description") {
          return 1;
        } else {
          return a.key < b.key ? -1 : 1;
        }
      },
    }),
  );
}

class DepsCalculator {
  private readonly scanner: ts.Scanner = ts.createScanner(ts.ScriptTarget.Latest, false);

  private projectPackageJson: IPackageJson;
  private packageVersionsReference: PackageJsonDependencies;
  private alreadyCrawled = false;

  constructor(
    private npmScope: string,
    private project: IProjectNode,
    private allProjects: IProjectNode[],
    private fileRead: (s: string) => string,
    private context: BuilderContext,
    private rootPackageJson: IPackageJson,
    private externalDependencies: ExternalDependencies,
    private isLibraryExternalized: _.Dictionary<true>,
    private dependentProjects: { [root: string]: DepsCalculator } = {},
  ) {
    // avoid circular dependency check to itself.
    this.dependentProjects[project.root] = this;

    this.projectPackageJson = this.readProjectPackageJson(this.project);
    this.packageVersionsReference = this.consolidateAllDependenciesIntoMap([
      this.rootPackageJson,
      this.projectPackageJson,
    ]);
  }

  /**
   * Generate the package.json for this project.
   */
  generatePackageJson(): IPackageJson {
    this.alreadyCrawled = true;

    // first generate this project's package.json
    const thisProjectPackageJson = this.generatePackageJsonOnly();

    // go through all the dependent projects. Note that this contains indirect
    // dependent projects too, since we passed the same object to all DepsCalculator
    // objects of dependencies (see #addDepIfNeeded).
    _.forEach(this.dependentProjects, (deps, projectPath) => {
      if (projectPath !== this.project.root && !deps.alreadyCrawled) {
        const depPackageJson = deps.generatePackageJson();
        this.mergeDependencies(thisProjectPackageJson, depPackageJson);
      }
    });

    return thisProjectPackageJson;
  }

  /**
   * Process a file and update it's dependencies
   */
  processFile(fileData: FileData): void {
    const filePath = fileData.file;
    const parsedPath = path.parse(filePath);
    if (
      (parsedPath.ext !== ".ts" &&
        parsedPath.ext !== ".tsx" &&
        parsedPath.ext !== ".js" &&
        parsedPath.ext !== ".jsx") ||
      parsedPath.dir.indexOf("__tests__") >= 0 ||
      parsedPath.name.endsWith(".spec") ||
      parsedPath.name.toLowerCase().endsWith("test")
    ) {
      return;
    }
    const content = this.fileRead(filePath);
    // const strippedContent = stripSourceCode(this.scanner, content);
    if (content !== "") {
      const tsFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
      this.processNode(filePath, tsFile, tsFile);
    }
  }

  private processNode(filePath: string, node: ts.Node, sourceFile: ts.SourceFile): void {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration: // import x from "xyz";
      case ts.SyntaxKind.ExportDeclaration: {
        // export x from "xyz";
        const moduleSpecifier = (node as ts.ImportDeclaration).moduleSpecifier;
        if (moduleSpecifier) {
          if (!moduleSpecifier.parent) {
            moduleSpecifier.parent = node;
          }
          this.addDepIfNeeded(
            this.getStringLiteralValue(moduleSpecifier, sourceFile),
          );
          return;
        }
        break;
      }
      case ts.SyntaxKind.ImportEqualsDeclaration: {
        // import y = require("y");
        const externalModuleReference: ts.ExternalModuleReference = (node as ts.ImportEqualsDeclaration)
          .moduleReference as ts.ExternalModuleReference;
        if (externalModuleReference) {
          if (!externalModuleReference.parent) {
            externalModuleReference.parent = node as ts.ImportEqualsDeclaration;
          }

          if (externalModuleReference.expression) {
            if (!externalModuleReference.expression.parent) {
              externalModuleReference.expression.parent = externalModuleReference;
            }

            this.addDepIfNeeded(
              this.getStringLiteralValue(externalModuleReference.expression, sourceFile),
            );
            return;
          }
        }

        break;
      }
      case ts.SyntaxKind.CallExpression: {
        // require("z"); or require.resolve("z"); or require.ensure(["a", "b"], ...)
        const callExpression: ts.CallExpression = node as ts.CallExpression;
        if (callExpression) {
          const expression = callExpression.expression;
          if (expression) {
            if (!expression.parent) {
              expression.parent = callExpression;
            }

            const callName: string = expression.getText(sourceFile);
            if (callName === "require" || callName === "require.resolve" || callName === "import") {
              const argument = callExpression.arguments[0];
              if (argument) {
                if (!argument.parent) {
                  argument.parent = callExpression;
                }

                this.addDepIfNeeded(
                  this.getStringLiteralValue(argument, sourceFile),
                );
                return;
              }
            } else if (
              callName.indexOf("require") >= 0 &&
              callName.indexOf("ensure") >= 0 &&
              callExpression.arguments[0].kind === ts.SyntaxKind.ArrayLiteralExpression
            ) {
              const argument2 = callExpression.arguments[0];
              if (!argument2.parent) {
                argument2.parent = callExpression;
              }

              (argument2 as ts.ArrayLiteralExpression).forEachChild((x: ts.Node) => {
                if (!x.parent) {
                  x.parent = argument2;
                }

                this.addDepIfNeeded(this.getStringLiteralValue(x, sourceFile));
                return;
              });
            }
          }
        }
        break;
      }
      default: {
        // nothing
      }
    }

    if (ts.isImportDeclaration(node) || (ts.isExportDeclaration(node) && node.moduleSpecifier)) {
      const imp = this.getStringLiteralValue(node.moduleSpecifier, sourceFile);
      this.addDepIfNeeded(imp);
      return; // stop traversing downwards
    }

    // Continue traversing down the AST from the current node
    ts.forEachChild(node, child => this.processNode(filePath, child, sourceFile));
  }

  /**
   * Only generates this project's package.json. Does not generate and use any
   * dependent project's package.json.
   */
  private generatePackageJsonOnly(): IPackageJson {
    _.forEach(this.project.graph.data.files, this.processFile.bind(this));

    if (!this.projectPackageJson.name) {
      const normalizedRoot = normalizedProjectRoot(this.project.graph);
      const fullDependencyScope = `@${this.npmScope}/${normalizedRoot}`;

      this.projectPackageJson.name = fullDependencyScope;
    }

    // take the version from the root package.json...
    if (!this.projectPackageJson.version) {
      this.projectPackageJson.version = this.rootPackageJson.version || "0.0.0";
    }

    if (!this.projectPackageJson.license) {
      this.projectPackageJson.license = this.rootPackageJson.license || "UNLICENSED";
    }

    if (_.isNil(this.projectPackageJson.private) && !_.isNil(this.rootPackageJson.private)) {
      this.projectPackageJson.private = this.rootPackageJson.private;
    }

    this.copyFromRootJson("description", "author", "bugs", "homepage", "keywords", "repository");

    // put our stamp on it.
    this.projectPackageJson["_generated"] =
      "This package.json was generated using @apployees-nx/node (https://github.com/apployees/apployees-nx)";

    return this.projectPackageJson;
  }

  private copyFromRootJson(...keys: string[]) {
    for (const key of keys) {
      if (!this.projectPackageJson[key] && this.rootPackageJson[key]) {
        this.projectPackageJson[key] = this.rootPackageJson[key];
      }
    }
  }

  private getPropertyAssignmentName(nameNode: ts.PropertyName) {
    switch (nameNode.kind) {
      case ts.SyntaxKind.Identifier:
        return (nameNode as ts.Identifier).getText();
      case ts.SyntaxKind.StringLiteral:
        return (nameNode as ts.StringLiteral).text;
      default:
        return null;
    }
  }

  private addDepIfNeeded(expr: string) {
    const matchingProject = this.allProjects.filter(a => {
      const normalizedRoot = normalizedProjectRoot(a.graph);
      return (
        expr === `@${this.npmScope}/${normalizedRoot}` ||
        expr.startsWith(`@${this.npmScope}/${normalizedRoot}#`) ||
        expr.startsWith(`@${this.npmScope}/${normalizedRoot}/`)
      );
    })[0];

    if (matchingProject) {
      this.addDependencyForProject(matchingProject);
    } else if (
      !expr.startsWith(".") &&
      (!this.externalDependencies || this.externalDependencies === "all" || _.isArray(this.externalDependencies))
    ) {
      this.addDependencyForNodeModule(expr);
    }
  }

  private addDependencyForProject(matchingProject) {
    // first check if the dependent project is itself externalized. If it is,
    // then no need to calculate it's dependencies...
    const normalizedRoot = normalizedProjectRoot(matchingProject);
    const fullDependencyScope = `@${this.npmScope}/${normalizedRoot}`;

    const isExternalized = this.isLibraryExternalized[fullDependencyScope];

    if (!isExternalized) {
      // if we are not externalized, then it means we are bundling this library,
      // which means that we need to go through this library's dependencies
      // as well.
      if (!this.dependentProjects[matchingProject.root]) {
        // we have not yet crawled this dependent project...so do it.
        const depsCalculator = new DepsCalculator(
          this.npmScope,
          matchingProject,
          this.allProjects,
          this.fileRead,
          this.context,
          this.rootPackageJson,
          this.externalDependencies,
          this.isLibraryExternalized,
          this.dependentProjects,
        );

        this.dependentProjects[matchingProject.root] = depsCalculator;
      } // else we don't need to do anything since we already crawled it.
    } else {
      // if the library is externalized, then it means we are not bundling this
      // library and it needs to be included in the package.json file.
      // So let's read the package.json file of the project, see what version
      // it is at and use it.

      let version = this.packageVersionsReference[fullDependencyScope];

      if (!version) {
        const dependentPackageJson = this.readProjectPackageJson(matchingProject);
        version = dependentPackageJson.version;

        if (!version) {
          output.warn({
            title: `Cannot extract version from ${matchingProject.root}/package.json`,
            bodyLines: [
              `Cannot extract version from ${matchingProject.root}/package.json.`,
              `The version number is needed because ${matchingProject.root} is set to not be bundled as per externalLibraries option`,
              `The version * will be used instead.`,
            ],
          });

          version = "*";
        }
      }

      if (version === "0.0.0") {
        version = "*";
      }

      if (!this.projectPackageJson.dependencies) {
        this.projectPackageJson.dependencies = {};
      }
      this.projectPackageJson.dependencies[fullDependencyScope] = version;

      // add this to rootPackageJson so that other dependencies don't have to
      // do the above calculation. Recall that rootPackageJson gets used in the
      // constructor to create packageVersionsReference.
      if (!this.rootPackageJson.dependencies) {
        this.rootPackageJson.dependencies = {};
      }
      this.rootPackageJson.dependencies[fullDependencyScope] = version;
    }
  }

  private addDependencyForNodeModule(name: string) {
    // this is not a relative path of any sort. Hence, it may be a node_modules dependency.
    // Note: we do not support relative paths to node_modules.

    // Build multiple possible names...e.g. if the name is `@scope/x/y/z`, then
    // the node_module could be @scope/x or @scope/x/y or @scope/x/y/z
    const segments = name.split("/").filter(x => !!x);
    const permutations = [];
    for (let i = 1; i <= segments.length; i++) {
      permutations.push(segments.slice(0, i).join("/"));
    }

    for (const permutation of permutations) {
      // First check if this is in the packageVersionsReference...
      let versionToUse: string = this.packageVersionsReference[permutation];

      if (!versionToUse) {
        versionToUse = this.getNodeModuleVersionFromNodeModules(permutation);
      }

      if (versionToUse) {
        // now check if we should even put it in the package.json file according
        // to externalDependencies...
        if (!_.isArray(this.externalDependencies) || this.externalDependencies.filter(a => a === permutation)) {
          if (!this.projectPackageJson.dependencies) {
            this.projectPackageJson.dependencies = {};
          }
          this.projectPackageJson.dependencies[permutation] = versionToUse;
        }

        break;
      }
    }
  }

  private getNodeModuleVersionFromNodeModules(name: string): string {
    const path = `${appRootPath}/node_modules/${name}/package.json`;
    if (existsSync(path)) {
      const nodeModulePackageJson: IPackageJson = readJsonFile(path) as IPackageJson;
      return nodeModulePackageJson.version;
    } else {
      return undefined;
    }
  }

  private getStringLiteralValue(node: ts.Node, sourceFile: ts.SourceFile): string {
    return node.getText(sourceFile).substr(1, node.getText().length - 2);
  }

  /**
   * Consolidates all dependencies, peerDependencies, devDependencies, etc. into a single map from
   * across the given packageJsonFiles. The higher index number files in the given array overwrite
   * the lower index files.
   * @param packageJsonFiles
   */
  private consolidateAllDependenciesIntoMap(packageJsonFiles: IPackageJson[]): PackageJsonDependencies {
    const merged: PackageJsonDependencies = {};
    _.forEach(packageJsonFiles, packageJsonFile => {
      _.forEach(packageJsonFile.devDependencies || {}, (value, key) => {
        merged[key] = value;
      });
      _.forEach(packageJsonFile.optionalDependencies || {}, (value, key) => {
        merged[key] = value;
      });
      _.forEach(packageJsonFile.peerDependencies || {}, (value, key) => {
        merged[key] = value;
      });
      _.forEach(packageJsonFile.dependencies || {}, (value, key) => {
        merged[key] = value;
      });
    });

    return merged;
  }

  private readProjectPackageJson(projectNode: IProjectNode): IPackageJson {
    const projectPackageJsonPath = `${appRootPath}/${projectNode.root}/package.json`;
    const projectPackageJson: IPackageJson = fileExists(projectPackageJsonPath)
      ? (readJsonFile(projectPackageJsonPath) as IPackageJson)
      : {};

    return projectPackageJson;
  }

  private mergeDependencies(base: IPackageJson, overwriteWith: IPackageJson): void {
    const toOverwrite = overwriteWith || ({} as IPackageJson);
    _.forEach(toOverwrite.devDependencies || {}, (value, key) => {
      if (!base.devDependencies) {
        base.devDependencies = {};
      }
      base.devDependencies[key] = value;
    });
    _.forEach(toOverwrite.optionalDependencies || {}, (value, key) => {
      if (!base.optionalDependencies) {
        base.optionalDependencies = {};
      }
      base.optionalDependencies[key] = value;
    });
    _.forEach(toOverwrite.peerDependencies || {}, (value, key) => {
      if (!base.peerDependencies) {
        base.peerDependencies = {};
      }
      base.peerDependencies[key] = value;
    });
    _.forEach(toOverwrite.dependencies || {}, (value, key) => {
      if (!base.dependencies) {
        base.dependencies = {};
      }
      base.dependencies[key] = value;
    });
  }
}

interface IProjectNode {
  graph: ProjectGraphNode;
  root: string;
  architect: object;
}
