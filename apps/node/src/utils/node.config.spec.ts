import { getNodeWebpackConfig } from './node.config';
import { BannerPlugin } from 'webpack';
jest.mock('tsconfig-paths-webpack-plugin');
import TsConfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { BuildNodeBuilderOptions } from './node-types';

describe('getNodePartial', () => {
  let input: BuildNodeBuilderOptions;
  beforeEach(() => {
    input = {
      main: 'main.ts',
      outputPath: 'dist',
      tsConfig: 'tsconfig.json',
      externalDependencies: 'all',
      fileReplacements: [],
      statsJson: false
    };
    (TsConfigPathsPlugin as any).mockImplementation(
      function MockPathsPlugin() {}
    );
  });

  describe('unconditionally', () => {
    it('should target commonjs', () => {
      const result = getNodeWebpackConfig(input);
      expect(result.output.libraryTarget).toEqual('commonjs');
    });

    it('should target node', () => {
      const result = getNodeWebpackConfig(input);

      expect(result.target).toEqual('node');
    });

    it('should not polyfill node apis', () => {
      const result = getNodeWebpackConfig(input);

      expect(result.node).toEqual(false);
    });
  });

  describe('the optimization option when true', () => {
    it('should not minify', () => {
      const result = getNodeWebpackConfig({
        ...input,
        optimization: true
      });

      expect(result.optimization.minimize).toEqual(false);
    });

    it('should not concatenate modules', () => {
      const result = getNodeWebpackConfig({
        ...input,
        optimization: true
      });

      expect(result.optimization.concatenateModules).toEqual(false);
    });
  });

  describe('the externalDependencies option', () => {
    it('should change all node_modules to commonjs imports', () => {
      const result = getNodeWebpackConfig(input);
      const callback = jest.fn();
      result.externals[0](null, '@nestjs/core', callback);
      expect(callback).toHaveBeenCalledWith(null, 'commonjs @nestjs/core');
    });

    it('should change given module names to commonjs imports but not others', () => {
      const result = getNodeWebpackConfig({
        ...input,
        externalDependencies: ['module1']
      });
      const callback = jest.fn();
      result.externals[0](null, 'module1', callback);
      expect(callback).toHaveBeenCalledWith(null, 'commonjs module1');
      result.externals[0](null, '@nestjs/core', callback);
      expect(callback).toHaveBeenCalledWith();
    });

    it('should not change any modules to commonjs imports', () => {
      const result = getNodeWebpackConfig({
        ...input,
        externalDependencies: 'none'
      });

      const callback = jest.fn();
      result.externals[0](null, 'module1', callback);
      expect(callback).toHaveBeenCalledWith();
      result.externals[0](null, '@nestjs/core', callback);
      expect(callback).toHaveBeenCalledWith();
    });
  });

  describe('the externalLibraries option', () => {
    it('should not change all @apployees-nx to commonjs imports by default', () => {
      const result = getNodeWebpackConfig(input);
      const callback = jest.fn();
      result.externals[0](null, '@apployees-nx/node', callback);
      expect(callback).toHaveBeenCalledWith();
    });

    it('should change given @apployees-nx names to commonjs imports but not others', () => {
      const result = getNodeWebpackConfig({
        ...input,
        externalLibraries: ['@apployees-nx/node']
      });
      const callback = jest.fn();
      result.externals[0](null, '@apployees-nx/node', callback);
      expect(callback).toHaveBeenCalledWith(null, 'commonjs @apployees-nx/node');
      result.externals[0](null, '@apployees-nx/core', callback);
      expect(callback).toHaveBeenCalledWith();
    });

    it('should change any modules to commonjs imports when set to all', () => {
      const result = getNodeWebpackConfig({
        ...input,
        externalLibraries: 'all'
      });

      const callback1 = jest.fn();
      const callback2 = jest.fn();
      result.externals[0](null, '@apployees-nx/node', callback1);
      expect(callback1).toHaveBeenCalledWith(null, 'commonjs @apployees-nx/node');
      result.externals[0](null, '@apployees-nx/doesntexist', callback2);
      expect(callback2).toHaveBeenCalledWith(null, 'commonjs @apployees-nx/doesntexist');
    });
  });
});
