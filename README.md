# Apployees-Nx

Apployees-Nx is a collection of builders and extensions for the [Nx monorepo infrastructure](https://nx.dev).

Apployees-Nx extends the default builders of Nx to add further capabilities that make your builds deploy ready, or actually
deploy your code to various cloud services.

Note that this repository is itself an Nx repository. That is, we bootstrapped the first builder using Nx's original Node Builder, and used our Enhanced Node Builder to build the rest of the builders and tooling in Apployees-Nx.

Here's a complete list of builders and tools.

## Enhanced Node Builder -- `@apployees-nx/node`

### Overview

Similar to the [Nx Node Builder](https://nx.dev/react/api/node/builders/build), with the following additions:

- Options: 
    - In addition to the `main` entry-point code, it also supports `otherEntries`. Each of the otherEntries will become a separate, individually invokeable entry point (i.e., you will be able to do `node myOtherEntryPoint.js`).
    - Optionally, you can have a package.json file in the root folder of your app, and it will be output. See Output below.
    - Optionally, just like `externalLibraries` that controls which node_modules should or should not be bundled, you can also define `externalLibraries`, which indicates which libraries within the mono-repo should or should be bundled.
    - Check out the [build schema](apps/node/src/builders/build/schema.json) for all the options.

- Output:
    - All the entry points and chunks
    - **A package.json file that makes your app an installable npm package.**
        - If you have a package.json in the root of your app, this package.json is merged with all the `externalDependencies` that you specified and output in to the dist folder.
        - If you don't have a package.json file, it will be generated for you.

### Usage

To use with a new project, start with the application schematic `nx g @apployees-nx/node:app myApp`. 

To use with an existing project, simply open up your angular.json or workspace.json and replace `@nrwl/node` with `@apployees-nx/node`. 

The schematic used when running `nx g @apployees-nx/node:app myApp` will add a develop option and a few scripts to your package.json Therefore, if you want to integrate with an existing project, it is recommended that you create a dummy new project using `nx g @apployees-nx/node:app myApp` just to see what things it adds to workspace.json/angular.json and package.json. 

## Webserver -- `@apployees-nx/webserver`

The Webserver builder and schematic is a Create-React-App-inspired Universal webserver. It is capable of:

1. Bundling your express server.

1. Bundling your client.

1. Server-side rendering on the client.

1. Generating a package.json file for you just like @apployees-nx/node above.

### Generate a new node project

`nx g @apployees-nx/node:app myApp`

Now you can do:

- `yarn dev-myApp` for development. Nx will watch all affected files of myApp and automatically compile and restart myApp.

- `yarn test-myApp` runs all the Jest unit tests for myApp.

- `yarn lint-myApp` runs the linter on myApp.

- `yarn build-myApp` builds myApp for production.

- `yarn build-dev-myApp` builds myApp for development, watching for changes (this is the target that `yarn dev-myApp` waits for before running the compiled output).


### Bootstrapping

The Enhanced Node Builder is bootstrapped with Nx's default out-of-the-box Node Builder. 

Here are the steps for development purposes:

1. In the angular.json file of this repo, change the `node` project:
    - Change `node:architect:build:builder` field to the value `@nrwl/node:build` instead of `@apployees-nx/node:build`.
    - Change `node:architect:build:options:main` field to the value `apps/node/src/builders/build/build.impl.ts`.
    - Change `node:architect:build:assets` to only have one entry: `apps/node/src`.
    - Notice that `node:architect:build:options:otherEntries` exists. This will be ignored by `@nrwl/node:build`, but will be used by `@apployees-nx/node:build` later on. So keep this entry.
2. Open `apps/node/src/builders.json` and change:
    - `builders:build:implementation` to be `"./main"`.
2. In a terminal, run `nx build node`.
3. `cd dist/apps/node`
4. `yarn link`
5. Now go back to the root directory (`cd ../../..`) and run `yarn link "@apployees-nx/node"`.
6. Go back to angular.json file and revert your changes. That is:
    - You should have `@apployees-nx/node:build` for the `node:architect:build:builder` field.
    - You should have `apps/node/src/main.ts` for the `node:architect:build:options:main` field.
    - The `node:architect:build:assets` field should be just as before.
7. Go back to the `apps/node/src/builders.json` and revert your changes.
    - That is, `builders:build:implementation` should be `"./builder-build"`.
8. In a terminal of the repo root, run `nx build node`.
    - You have effectively built `@apployees-nx/node` using an `@nrwl/node`-builder-compiled version of `@apployees-nx/node` at this point.
    - Your dist folder now is a publish-able `@apployees-nx/node` package.
9. To make further changes to `@apployees-nx/node`, simply make the changes and run `nx build node`. Since the `dist/apps/node` folder is already yarn linked, you will be building `@apployees-nx/node` using `@apployees-nx/node`.
    - Alternatively, you can also just run `nx build node --configuration development` and it will continuously watch changes and recompile.
10. You can now also build the rest of the apps with `@apployees-nx/node` if they require it, or the use the same process to bootstrap another builder if it requires it.

Note that an alternative to the above bootstrapping would have been to use the published version of `@apployees-nx/node` instead of `@nrwl/node`. That might actually be easier than above...but I wrote the above steps when I didn't even have a published builder initially.

# NX Documentation

## Adding capabilities to your workspace

Nx supports many plugins which add capabilities for developing different types of applications and different tools.

These capabilities include generating applications, libraries, etc as well as the devtools to test, and build projects as well.

Below are some plugins which you can add to your workspace:

- [React](https://reactjs.org)
  - `npm install --save-dev @nrwl/react`
- Web (no framework frontends)
  - `npm install --save-dev @nrwl/web`
- [Angular](https://angular.io)
  - `npm install --save-dev @nrwl/angular`
- [Nest](https://nestjs.com)
  - `npm install --save-dev @nrwl/nest`
- [Express](https://expressjs.com)
  - `npm install --save-dev @nrwl/express`
- [Node](https://nodejs.org)
  - `npm install --save-dev @apployees-nx/node`
- Webserver -- a Create-React-App inspired Universal webserver
  - `npm install --save-dev @apployees-nx/webserver`

## Generate an application

Run `nx g @nrwl/react:app my-app` to generate an application.

> You can use any of the plugins above to generate applications as well.

When using Nx, you can create multiple applications and libraries in the same workspace.

## Generate a library

Run `nx g @nrwl/node:lib my-lib` to generate a library.

> You can also use any of the plugins above to generate libraries as well.

Libraries are sharable across libraries and applications. They can be imported from `@apployees-nx/mylib`.

## Development server

Run `nx serve my-app` for a dev server. Navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `nx g @nrwl/react:component my-component --project=my-app` to generate a new component.

## Build

Run `nx build my-app` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `nx test my-app` to execute the unit tests via [Jest](https://jestjs.io).

Run `nx affected:test` to execute the unit tests affected by a change.

## Running end-to-end tests

Run `ng e2e my-app` to execute the end-to-end tests via [Cypress](https://www.cypress.io).

Run `nx affected:e2e` to execute the end-to-end tests affected by a change.

## Understand your workspace

Run `nx dep-graph` to see a diagram of the dependencies of your projects.

## Further help

Visit the [Nx Documentation](https://nx.dev) to learn more.
