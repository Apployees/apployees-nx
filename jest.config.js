// eslint-disable-next-line no-undef
const { pathsToModuleNameMapper } = require("ts-jest/utils");
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
// eslint-disable-next-line no-undef
const { compilerOptions } = require("./tsconfig");
// eslint-disable-next-line no-undef
const path = require("path");

// eslint-disable-next-line no-undef
module.exports = {
  testMatch: ["**/+(*.)+(spec|test).+(ts|js)?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    "^.+\\.(ts|js|html)$": "ts-jest",
  },
  resolver: "@nrwl/jest/plugins/resolver",
  moduleFileExtensions: ["ts", "js", "html"],
  // eslint-disable-next-line no-undef
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: __dirname + "/" }),
  coverageReporters: ["html"],
  passWithNoTests: true,
};
