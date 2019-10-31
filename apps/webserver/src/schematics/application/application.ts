import {
  apply,
  chain,
  externalSchematic,
  mergeWith,
  move,
  noop,
  Rule,
  SchematicContext,
  template,
  Tree,
  url
} from "@angular-devkit/schematics";
import { join, normalize, Path } from "@angular-devkit/core";
import { Schema } from "./schema";
import {
  addLintFiles,
  generateProjectLint, getNpmScope,
  offsetFromRoot,
  toFileName,
  updateJsonInTree,
  updateWorkspaceInTree
} from "@nrwl/workspace";
import init from "../init/init";
import { existsSync } from "fs";
import path from "path";

interface NormalizedSchema extends Schema {
  appProjectRoot: Path;
  parsedTags: string[];
}

function updateNxJson(options: NormalizedSchema): Rule {
  return updateJsonInTree(`/nx.json`, json => {
    return {
      ...json,
      projects: {
        ...json.projects,
        [options.name]: { tags: options.parsedTags }
      }
    };
  });
}

function getBuildConfig(project: any, options: NormalizedSchema) {
  return {
    builder: "@apployees-nx/webserver:build",
    options: {
      outputPath: join(normalize("dist"), options.appProjectRoot),
      appHtml: join(project.sourceRoot, "public", "app.html"),
      serverMain: join(project.sourceRoot, "index.ts"),
      clientMain: join(project.sourceRoot, "client", "index.tsx"),
      favicon: join(project.sourceRoot, "public", "logo512.png"),
      manifestJson: join(project.sourceRoot, "public", "manifest.json"),
      clientOtherEntries: {
        anotherClientEntry_head: join(project.sourceRoot, "client", "anotherClientEntry.ts")
      },
      clientWebpackConfig: join(options.appProjectRoot, "webpack.client.overrides.js"),
      lessStyleVariables: join(options.appProjectRoot, "antd-theme.less"),
      tsConfig: join(options.appProjectRoot, 'tsconfig.app.json'),
      assets: [join(project.sourceRoot, "public")]
    },
    configurations: {
      production: {
        extractLicenses: true,
        inspect: false,
        watch: false,
        dev: false,
        fileReplacements: [
          {
            replace: join(project.sourceRoot, "environments/environment.ts"),
            with: join(project.sourceRoot, "environments/environment.prod.ts")
          }
        ]
      },
      development: {
        dev: true,
        inspect: true,
        extractLicenses: false,
        notifier: {
          excludeWarnings: true
        }
      }
    }
  };
}

function updateWorkspaceJson(options: NormalizedSchema): Rule {
  return updateWorkspaceInTree(workspaceJson => {
    const project = {
      root: options.appProjectRoot,
      sourceRoot: join(options.appProjectRoot, "src"),
      projectType: "application",
      prefix: options.name,
      schematics: {},
      architect: {} as any
    };

    project.architect.build = getBuildConfig(project, options);
    project.architect.lint = generateProjectLint(
      normalize(project.root),
      join(normalize(project.root), "tsconfig.app.json"),
      options.linter
    );

    workspaceJson.projects[options.name] = project;

    workspaceJson.defaultProject = workspaceJson.defaultProject || options.name;

    return workspaceJson;
  });
}

function addAppFiles(options: NormalizedSchema, npmScope: string): Rule {
  let appDir = path.resolve(__dirname, path.normalize(`schematics/application/files/app`));
  if (!existsSync(appDir)) {
    appDir = path.resolve(__dirname, path.normalize(`files/app`));
  }

  return mergeWith(
    apply(url(appDir), [
      template({
        tmpl: "",
        name: options.name,
        npmScope: npmScope,
        root: options.appProjectRoot,
        offset: offsetFromRoot(options.appProjectRoot)
      }),
      move(options.appProjectRoot)
    ])
  );
}

function updateRootPackageJson(options: NormalizedSchema): Rule {
  return (host: Tree) => {
    return updateJsonInTree(`/package.json`, json => {

      if (!json.scripts) {
        json.scripts = {};
      }

      json.scripts[`dev-${options.name}`] = `nx build ${options.name} --configuration development`;
      json.scripts[`build-${options.name}`] = `nx build ${options.name} --configuration production`;
      json.scripts[`lint-${options.name}`] = `nx lint ${options.name}`;
      json.scripts[`test-${options.name}`] = `nx test ${options.name}`;

      return json;
    });
  };
}



export default function(schema: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const options = normalizeOptions(schema);
    const npmScope = getNpmScope(host) || "yourOrg";

    return chain([
      init({
        skipFormat: true
      }),
      addLintFiles(options.appProjectRoot, options.linter),
      addAppFiles(options, npmScope),
      updateWorkspaceJson(options),
      updateNxJson(options),
      updateRootPackageJson(options),
      options.unitTestRunner === "jest"
        ? externalSchematic("@nrwl/jest", "jest-project", {
          project: options.name,
          setupFile: "none",
          supportTsx: true,
          skipSerializers: true
        })
        : noop()
    ])(host, context);
  };
}

function normalizeOptions(options: Schema): NormalizedSchema {
  const appDirectory = options.directory
    ? `${toFileName(options.directory)}/${toFileName(options.name)}`
    : toFileName(options.name);

  const appProjectName = appDirectory.replace(new RegExp("/", "g"), "-");

  const appProjectRoot = join(normalize("apps"), appDirectory);

  const parsedTags = options.tags
    ? options.tags.split(",").map(s => s.trim())
    : [];

  return {
    ...options,
    name: toFileName(appProjectName),
    appProjectRoot,
    parsedTags
  };
}
