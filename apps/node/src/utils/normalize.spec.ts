import { normalizeBuildOptions } from './normalize';
import { Path, normalize, workspaces } from "@angular-devkit/core";

import fs from 'fs';
import { BuildNodeBuilderOptions } from './node-types';
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { getMockContext, MockBuilderContext } from "@apployees-nx/common-build-utils";

jest.mock('tsconfig-paths-webpack-plugin');

describe('normalizeBuildOptions', () => {
  let testOptions: BuildNodeBuilderOptions;
  let context: MockBuilderContext;
  let root: string;
  let sourceRoot: Path;

  beforeEach(async () => {
    testOptions = {
      main: 'apps/nodeapp/src/main.ts',
      tsConfig: 'apps/nodeapp/tsconfig.app.json',
      outputPath: 'dist/apps/nodeapp',
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
    root = '/root';
    sourceRoot = normalize('apps/nodeapp/src');
    context = await getMockContext();
    await context.addTarget(
      {
        project: 'nodeapp',
        target: 'build'
      },
      '@apployees-nx/node:build'
    );
    spyOn(workspaces, 'readWorkspace').and.returnValue({
      workspace: {
        projects: {
          get: () => ({
            sourceRoot: '/root/apps/nodeapp/src',
            root: '/root'
          })
        }
      }
    });
    (TsConfigPathsPlugin as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function MockPathsPlugin() {}
    );
  });
  it('should add the root', () => {
    const result = normalizeBuildOptions(testOptions, context, sourceRoot);
    expect(result.root).toEqual('/root');
  });

  it('should resolve main from root', () => {
    const result = normalizeBuildOptions(testOptions, context, sourceRoot);
    expect(result.main).toEqual('/root/apps/nodeapp/src/main.ts');
  });

  it('should resolve the output path', () => {
    const result = normalizeBuildOptions(testOptions, context, sourceRoot);
    expect(result.outputPath).toEqual('/root/dist/apps/nodeapp');
  });

  it('should resolve the tsConfig path', () => {
    const result = normalizeBuildOptions(testOptions, context, sourceRoot);
    expect(result.tsConfig).toEqual('/root/apps/nodeapp/tsconfig.app.json');
  });

  it('should normalize asset patterns', () => {
    spyOn(fs, 'statSync').and.returnValue({
      isDirectory: () => true
    });
    const result = normalizeBuildOptions(
      {
        ...testOptions,
        root,
        assets: [
          'apps/nodeapp/src/assets',
          {
            input: 'outsideproj',
            output: 'output',
            glob: '**/*',
            ignore: ['**/*.json']
          }
        ]
      } as BuildNodeBuilderOptions,
      context,
      sourceRoot
    );
    expect(result.assets).toEqual([
      {
        input: '/root/apps/nodeapp/src/assets',
        output: 'assets',
        glob: '**/*'
      },
      {
        input: '/root/outsideproj',
        output: 'output',
        glob: '**/*',
        ignore: ['**/*.json']
      }
    ]);
  });

  it('should resolve the file replacement paths', () => {
    const result = normalizeBuildOptions(testOptions, context, sourceRoot);
    expect(result.fileReplacements).toEqual([
      {
        replace: '/root/apps/environment/environment.ts',
        with: '/root/apps/environment/environment.prod.ts'
      },
      {
        replace: '/root/module1.ts',
        with: '/root/module2.ts'
      }
    ]);
  });
});
