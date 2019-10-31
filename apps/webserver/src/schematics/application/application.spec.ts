import { Tree } from '@angular-devkit/schematics';
import stripJsonComments from 'strip-json-comments';
import { createEmptyWorkspace, getFileContent } from '@nrwl/workspace/testing';
import { NxJson, readJsonInTree } from '@nrwl/workspace';
import { webserverTestRunner } from "../../utils/common/webserver-test-runner";
import { createApp, runSchematic } from "@apployees-nx/common-build-utils";

describe('app', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = Tree.empty();
    appTree = createEmptyWorkspace(appTree);
  });

  describe('not nested', () => {
    it('should update workspace.json', async () => {
      const tree = await runSchematic(webserverTestRunner, 'app', { name: 'myWebserverApp' }, appTree);
      const workspaceJson = readJsonInTree(tree, '/workspace.json');
      const project = workspaceJson.projects['my-webserver-app'];
      expect(project.root).toEqual('apps/my-webserver-app');
      expect(project.architect).toEqual(
        jasmine.objectContaining({
          build: {
            builder: '@apployees-nx/webserver:build',
            options: {
              outputPath: 'dist/apps/my-webserver-app',
              main: 'apps/my-webserver-app/src/main.ts',
              tsConfig: 'apps/my-webserver-app/tsconfig.app.json',
              assets: ['apps/my-webserver-app/src/assets']
            },
            configurations: {
              production: {
                dev: false,
                watch: false,
                extractLicenses: true,
                inspect: false,
                fileReplacements: [
                  {
                    replace: 'apps/my-webserver-app/src/environments/environment.ts',
                    with:
                      'apps/my-webserver-app/src/environments/environment.prod.ts'
                  }
                ]
              },
              development: {
                dev: true,
                extractLicenses: false
              }
            }
          },
          serve: {
            builder: '@apployees-nx/webserver:execute',
            options: {
              buildTarget: 'my-webserver-app:build:development',
              inspect: true
            }
          }
        })
      );
      expect(workspaceJson.projects['my-webserver-app'].architect.lint).toEqual({
        builder: '@nrwl/linter:lint',
        options: {
          config: "apps/my-webserver-app/.eslintrc",
          tsConfig: [
            'apps/my-webserver-app/tsconfig.app.json',
            'apps/my-webserver-app/tsconfig.spec.json'
          ],
          exclude: ['**/node_modules/**', '!apps/my-webserver-app/**'],
          linter: "eslint"
        }
      });
      expect(workspaceJson.projects['my-webserver-app-e2e']).toBeUndefined();
      expect(workspaceJson.defaultProject).toEqual('my-webserver-app');
    });

    it('should update nx.json', async () => {
      const tree = await runSchematic(webserverTestRunner,
        'app',
        { name: 'myWebserverApp', tags: 'one,two' },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson).toEqual({
        npmScope: 'proj',
        projects: {
          'my-webserver-app': {
            tags: ['one', 'two']
          }
        }
      });
    });

    it('should generate files', async () => {
      const tree = await runSchematic(webserverTestRunner, 'app', { name: 'myWebserverApp' }, appTree);
      expect(tree.exists(`apps/my-webserver-app/jest.config.js`)).toBeTruthy();
      expect(tree.exists('apps/my-webserver-app/src/main.ts')).toBeTruthy();

      const tsconfig = readJsonInTree(tree, 'apps/my-webserver-app/tsconfig.json');
      expect(tsconfig.extends).toEqual('../../tsconfig.json');
      expect(tsconfig.compilerOptions.types).toContain('node');
      expect(tsconfig.compilerOptions.types).toContain('jest');

      const tsconfigApp = JSON.parse(
        stripJsonComments(
          getFileContent(tree, 'apps/my-webserver-app/tsconfig.app.json')
        )
      );
      expect(tsconfigApp.compilerOptions.outDir).toEqual('../../dist/out-tsc');
      expect(tsconfigApp.extends).toEqual('./tsconfig.json');

      const eslintrc = JSON.parse(
        stripJsonComments(getFileContent(tree, 'apps/my-webserver-app/.eslintrc'))
      );
      expect(eslintrc.extends).toEqual('../../.eslintrc');
    });
  });

  describe('nested', () => {
    it('should update workspace.json', async () => {
      const tree = await runSchematic(webserverTestRunner,
        'app',
        { name: 'myWebserverApp', directory: 'myDir' },
        appTree
      );
      const workspaceJson = readJsonInTree(tree, '/workspace.json');

      expect(workspaceJson.projects['my-dir-my-webserver-app'].root).toEqual(
        'apps/my-dir/my-webserver-app'
      );

      expect(
        workspaceJson.projects['my-dir-my-webserver-app'].architect.lint
      ).toEqual({
        builder: '@nrwl/linter:lint',
        options: {
          config: "apps/my-dir/my-webserver-app/.eslintrc",
          tsConfig: [
            'apps/my-dir/my-webserver-app/tsconfig.app.json',
            'apps/my-dir/my-webserver-app/tsconfig.spec.json'
          ],
          exclude: ['**/node_modules/**', '!apps/my-dir/my-webserver-app/**'],
          linter: "eslint",
        }
      });

      expect(workspaceJson.projects['my-dir-my-webserver-app-e2e']).toBeUndefined();
      expect(workspaceJson.defaultProject).toEqual('my-dir-my-webserver-app');
    });

    it('should update nx.json', async () => {
      const tree = await runSchematic(webserverTestRunner,
        'app',
        { name: 'myWebserverApp', directory: 'myDir', tags: 'one,two' },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson).toEqual({
        npmScope: 'proj',
        projects: {
          'my-dir-my-webserver-app': {
            tags: ['one', 'two']
          }
        }
      });
    });

    it('should generate files', async () => {
      const hasJsonValue = ({ path, expectedValue, lookupFn }) => {
        const content = getFileContent(tree, path);
        const config = JSON.parse(stripJsonComments(content));

        expect(lookupFn(config)).toEqual(expectedValue);
      };
      const tree = await runSchematic(webserverTestRunner,
        'app',
        { name: 'myWebserverApp', directory: 'myDir' },
        appTree
      );

      // Make sure these exist
      [
        `apps/my-dir/my-webserver-app/jest.config.js`,
        'apps/my-dir/my-webserver-app/src/main.ts'
      ].forEach(path => {
        expect(tree.exists(path)).toBeTruthy();
      });

      // Make sure these have properties
      [
        {
          path: 'apps/my-dir/my-webserver-app/tsconfig.json',
          lookupFn: json => json.extends,
          expectedValue: '../../../tsconfig.json'
        },
        {
          path: 'apps/my-dir/my-webserver-app/tsconfig.app.json',
          lookupFn: json => json.compilerOptions.outDir,
          expectedValue: '../../../dist/out-tsc'
        },
        {
          path: 'apps/my-dir/my-webserver-app/tsconfig.app.json',
          lookupFn: json => json.compilerOptions.types,
          expectedValue: ['node']
        },
        {
          path: 'apps/my-dir/my-webserver-app/.eslintrc',
          lookupFn: json => json.extends,
          expectedValue: '../../../.eslintrc'
        }
      ].forEach(hasJsonValue);
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      const tree = await runSchematic(webserverTestRunner,
        'app',
        { name: 'myWebserverApp', unitTestRunner: 'none' },
        appTree
      );
      expect(tree.exists('apps/my-webserver-app/src/test-setup.ts')).toBeFalsy();
      expect(tree.exists('apps/my-webserver-app/src/test.ts')).toBeFalsy();
      expect(tree.exists('apps/my-webserver-app/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('apps/my-webserver-app/jest.config.js')).toBeFalsy();
      const workspaceJson = readJsonInTree(tree, 'workspace.json');
      expect(
        workspaceJson.projects['my-webserver-app'].architect.test
      ).toBeUndefined();
      expect(
        workspaceJson.projects['my-webserver-app'].architect.lint.options.tsConfig
      ).toEqual(['apps/my-webserver-app/tsconfig.app.json']);
    });
  });

  describe('frontendProject', () => {
    it('should configure proxy', async () => {
      appTree = createApp(appTree, 'my-frontend');

      const tree = await runSchematic(webserverTestRunner,
        'app',
        { name: 'myWebserverApp', frontendProject: 'my-frontend' },
        appTree
      );

      expect(tree.exists('apps/my-frontend/proxy.conf.json')).toBeTruthy();
      const serve = JSON.parse(tree.readContent('workspace.json')).projects[
        'my-frontend'
      ].architect.serve;
      expect(serve.options.proxyConfig).toEqual(
        'apps/my-frontend/proxy.conf.json'
      );
    });

    it('should work with unnormalized project names', async () => {
      appTree = createApp(appTree, 'myFrontend');

      const tree = await runSchematic(webserverTestRunner,
        'app',
        { name: 'myWebserverApp', frontendProject: 'myFrontend' },
        appTree
      );

      expect(tree.exists('apps/my-frontend/proxy.conf.json')).toBeTruthy();
      const serve = JSON.parse(tree.readContent('workspace.json')).projects[
        'my-frontend'
      ].architect.serve;
      expect(serve.options.proxyConfig).toEqual(
        'apps/my-frontend/proxy.conf.json'
      );
    });
  });
});
