/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { SchematicTestRunner } from "@angular-devkit/schematics/testing";
import { Rule, Tree } from "@angular-devkit/schematics";
import { join } from "path";
import { TestingArchitectHost, TestLogger } from "@angular-devkit/architect/testing";
import { JsonObject, schema } from "@angular-devkit/core";
import { Architect, BuilderContext, ScheduleOptions, Target } from "@angular-devkit/architect";
import { toFileName } from "@nrwl/workspace";

export function runSchematic(runner: SchematicTestRunner, schematicName: string, options: any, tree: Tree) {
  return runner.runSchematicAsync(schematicName, options, tree).toPromise();
}

export function callRule(runner: SchematicTestRunner, rule: Rule, tree: Tree) {
  return runner.callRule(rule, tree).toPromise();
}

export interface IAppConfig {
  appName: string; // name of app
  appModule: string; // app/app.module.ts in the above sourceDir
}
let appConfig: IAppConfig; // configure built in createApp()
export function createApp(tree: Tree, appName: string, routing = true): Tree {
  appName = toFileName(appName);
  // save for getAppDir() lookup by external *.spec.ts tests
  appConfig = {
    appName,
    appModule: `/apps/${appName}/src/app/app.module.ts`,
  };

  tree.create(
    appConfig.appModule,
    `
     export function test() { return "hello"; }
  `,
  );
  tree.create(
    `/apps/${appName}/src/main.ts`,
    `
    import { test } from './app/app.module';
    
    console.log(test());
  `,
  );
  tree.create(
    `/apps/${appName}/tsconfig.app.json`,
    JSON.stringify({
      include: ["**/*.ts"],
    }),
  );
  tree.create(
    `/apps/${appName}-e2e/tsconfig.e2e.json`,
    JSON.stringify({
      include: ["../**/*.ts"],
    }),
  );
  tree.overwrite(
    "/workspace.json",
    JSON.stringify({
      newProjectRoot: "",
      version: 1,
      projects: {
        [appName]: {
          root: `apps/${appName}`,
          sourceRoot: `apps/${appName}/src`,
          architect: {
            build: {
              options: {
                main: `apps/${appName}/src/main.ts`,
              },
            },
            serve: {
              options: {},
            },
          },
        },
      },
    }),
  );
  return tree;
}

export async function getTestArchitect() {
  const architectHost = new TestingArchitectHost("/root", "/root");
  const registry = new schema.CoreSchemaRegistry();
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);

  const architect = new Architect(architectHost, registry);

  await architectHost.addBuilderFromPackage(join(__dirname, "./__tests__"));

  return [architect, architectHost] as [Architect, TestingArchitectHost];
}

export async function getMockContext() {
  const [architect, architectHost] = await getTestArchitect();

  const context = new MockBuilderContext(architect, architectHost);
  await context.addBuilderFromPackage(join(__dirname, "./__tests__"));
  return context;
}

export class MockBuilderContext implements BuilderContext {
  id: 0;

  builder: any = {};
  analytics = null;

  target: Target = {
    project: null,
    target: null,
  };

  get currentDirectory() {
    return this.architectHost.currentDirectory;
  }

  get workspaceRoot() {
    return this.architectHost.workspaceRoot;
  }

  logger = new TestLogger("test");

  constructor(private architect: Architect, private architectHost: TestingArchitectHost) {}

  async addBuilderFromPackage(path: string) {
    return await this.architectHost.addBuilderFromPackage(path);
  }

  async addTarget(target: Target, builderName: string) {
    return await this.architectHost.addTarget(target, builderName);
  }

  getBuilderNameForTarget(target: Target) {
    return this.architectHost.getBuilderNameForTarget(target);
  }

  scheduleTarget(target: Target, overrides?: JsonObject, scheduleOptions?: ScheduleOptions) {
    return this.architect.scheduleTarget(target, overrides, scheduleOptions);
  }

  scheduleBuilder(name: string, overrides?: JsonObject, scheduleOptions?: ScheduleOptions) {
    return this.architect.scheduleBuilder(name, overrides, scheduleOptions);
  }

  getTargetOptions(target: Target) {
    return this.architectHost.getOptionsForTarget(target);
  }

  validateOptions<T extends JsonObject = JsonObject>(options: JsonObject, builderName: string): Promise<T> {
    return Promise.resolve<T>(options as T);
  }

  reportRunning() {
    // nothing
  }

  reportStatus(status: string) {
    // nothing
  }

  reportProgress(current: number, total?: number, status?: string) {
    // nothing
  }

  addTeardown(teardown: () => Promise<void> | void) {
    // nothing
  }
}
