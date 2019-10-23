import { JsonObject, normalize, workspaces } from "@angular-devkit/core";
import { join } from "path";
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { of } from "rxjs";
import buildWebpack from "@angular-devkit/build-webpack";
import { Architect } from "@angular-devkit/architect";
import { getTestArchitect } from "../../utils/testing";
import { BuildNodeBuilderOptions } from "../../utils/node-types";

jest.mock('tsconfig-paths-webpack-plugin');

describe('NodeBuildBuilder', () => {
  let testOptions: BuildNodeBuilderOptions & JsonObject;
  let architect: Architect;
  let runWebpack: jest.Mock;

  beforeEach(async () => {
    [architect] = await getTestArchitect();

    testOptions = {
      main: 'apps/nodeapp/src/main.ts',
      tsConfig: 'apps/nodeapp/tsconfig.app.json',
      outputPath: 'dist/apps/nodeapp',
      externalDependencies: 'all',
      fileReplacements: [
        {
          replace: 'apps/environment/environment.ts',
          with: 'apps/environment/environment.prod.ts'
        },
        {
          replace: 'module1.ts',
          with: 'module2.ts'
        }
      ],
      assets: [],
      statsJson: false
    };
    runWebpack = jest.fn().mockImplementation((config, context, options) => {
      options.logging({
        toJson: () => ({
          stats: 'stats'
        })
      });
      return of({ success: true });
    });
    (buildWebpack as any).runWebpack = runWebpack;
    spyOn(workspaces, 'readWorkspace').and.returnValue({
      workspace: {
        projects: {
          get: () => ({
            sourceRoot: '/root/apps/nodeapp/src'
          })
        }
      }
    });
    (TsConfigPathsPlugin as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function MockPathsPlugin() {}
    );
  });

  describe('run', () => {
    it('should call runWebpack', async () => {
      const run = await architect.scheduleBuilder(
        '@apployees-nx/node:build',
        testOptions
      );
      await run.output.toPromise();

      await run.stop();

      expect(runWebpack).toHaveBeenCalled();
    });

    it('should emit the outfile along with success', async () => {
      const run = await architect.scheduleBuilder(
        '@apployees-nx/node:build',
        testOptions
      );
      const output = await run.output.toPromise();

      await run.stop();

      expect(output.success).toEqual(true);
      expect(output.outfile).toEqual('/root/dist/apps/nodeapp/[name].js');
    });

    describe('webpackConfig option', () => {
      it('should require the specified function and use the return value', async () => {
        const mockFunction = jest.fn(config => ({
          config: 'config'
        }));
        jest.mock(
          join(normalize('/root'), 'apps/nodeapp/webpack.config.js'),
          () => mockFunction,
          {
            virtual: true
          }
        );
        testOptions.webpackConfig = 'apps/nodeapp/webpack.config.js';
        const run = await architect.scheduleBuilder(
          '@apployees-nx/node:build',
          testOptions
        );
        await run.output.toPromise();

        await run.stop();

        expect(mockFunction).toHaveBeenCalled();
        expect(runWebpack).toHaveBeenCalledWith(
          {
            config: 'config'
          },
          jasmine.anything(),
          jasmine.anything()
        );
        // expect(runWebpack.calls.first().args[0]).toEqual({
        //   config: 'config'
        // });
      });
    });
  });
});
