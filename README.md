# Apployees-Nx

Apployees-Nx is a collection of builders and extensions for the [Nx monorepo tooling](https://nx.dev).

Apployees-Nx extends the default builders of Nx to add further capabilities that make your builds deploy ready, or actually
deploy your code to various cloud services.

Note that this repository is itself an Nx repository. That is, we bootstrapped the first builder using Nx's original Node Builder, and used our Enhanced Node Builder to build the rest of the builders and tooling in Apployees-Nx.

Here's a complete list of builders and tools:

1. [Webserver](#webserver----apployees-nxwebserver)
    - A Create-React-App Universal/SSR-enabled builder and schematic for NX.
    
1. [Enhanced Node Builder](#enhanced-node-builder----apployees-nxnode)
    - An enhanced node builder that supports multiple entry points and independent library bundling (i.e. do not bundle selected libraries in the mono-repo during compile so they can be published separately.) 

1. Deploy-with-Serverless Builder -- coming soon

1. Deploy-with-Cloudformation Builder -- coming soon

## Webserver -- `@apployees-nx/webserver`

### Overview

The Webserver builder and schematic is a Create-React-App-inspired Universal webserver. It is capable of:

1. Bundling your express server.

1. Bundling your client.

1. Server-side rendering on the client.

1. Generating a package.json file for you just like @apployees-nx/node below.

### Usage: Generate a new webserver project

To use with a new project, start with the application schematic `nx g @apployees-nx/webserver:app myApp`. 

The schematic used when running `nx g @apployees-nx/webserver:app myApp` will add a few scripts to your package.json:

- `yarn dev-myApp` for development. Nx will watch all affected files of myApp and automatically compile and restart myApp.

- `yarn test-myApp` runs all the Jest unit tests for myApp.

- `yarn lint-myApp` runs the linter on myApp.

- `yarn build-myApp` builds myApp for production.

- `yarn build-dev-myApp` builds myApp for development, watching for changes (this is the target that `yarn dev-myApp` waits for before running the compiled output).

### Usage: Use with an existing webserver project

To use with an existing project, create a new project first using the above command and change the locations of files in angular/workspace.json to point to your existing project.

### Developing @apployees-nx/webserver

The Webserver builder is bootstrapped with `apployees-nx/node` builder. You will first need to follow the bootstrapping instructions below from `apployees-nx/node` then follow these instructions. 

Here are the steps for developing `@apployees-nx/webserver` itself:

1. Run `yarn dev-webserver`.

1. Go to the dist folder and run yarn link.

    ```
    cd dist/apps/webserver
    yarn link
    ```

1. Go to the root directory and link webserver.

    ```
    cd ../../..
    yarn link "@apployees-nx/webserver"
    ```

1. To build before publishing webserver, simply run `yarn build-webserver`.

1. You can now also build the rest of the apps with `@apployees-nx/webserver` if they require it, or the use the same process to bootstrap another builder if it requires it.
    - There are a few examples that use `@apployees-nx/webserver` in the examples directory you can play around with. Check out the package.json scripts for how to develop, run, and test them. 


## Enhanced Node Builder -- `@apployees-nx/node`

### Overview

Similar to the [Nx Node Builder](https://nx.dev/react/api/node/builders/build), with the following additions:

- Options: 
    - In addition to the `main` entry-point code, it also supports `otherEntries`. Each of the otherEntries will become a separate, individually invokeable entry point (i.e., you will be able to do `node myOtherEntryPoint.js`).
    - Optionally, you can have a package.json file in the root folder of your app, and it will be output. See Output below.
    - Optionally, just like `externalLibraries` that controls which node_modules should or should not be bundled, you can also define `externalLibraries`, which indicates which libraries within the mono-repo should or should not be bundled.
    - Check out the [build schema](apps/node/src/builders/build/schema.json) for all the options.

- Output:
    - All the entry points and chunks
    - **A package.json file that makes your app an installable npm package.**
        - If you have a package.json in the root of your app, this package.json is merged with all the `externalDependencies` that you specified and output in to the dist folder.
        - If you don't have a package.json file, it will be generated for you.

### Usage: Generate a new node project

To use with a new project, start with the application schematic `nx g @apployees-nx/node:app myApp`. 

The schematic used when running `nx g @apployees-nx/node:app myApp` will add a develop option and a few scripts to your package.json: 

- `yarn dev-myApp` for development. Nx will watch all affected files of myApp and automatically compile and restart myApp.

- `yarn test-myApp` runs all the Jest unit tests for myApp.

- `yarn lint-myApp` runs the linter on myApp.

- `yarn build-myApp` builds myApp for production.

- `yarn build-dev-myApp` builds myApp for development, watching for changes (this is the target that `yarn dev-myApp` waits for before running the compiled output).

### Usage: Use with an existing project

To use with an existing project, simply open up your angular.json or workspace.json and replace `@nrwl/node` with `@apployees-nx/node`.

It is recommended that you create a dummy new project using `nx g @apployees-nx/node:app myApp` just to see what things it adds to workspace.json/angular.json and package.json. 

### Developing @apployees-nx/node

The Enhanced Node Builder is bootstrapped with Nx's default out-of-the-box Node Builder. 

Here are the steps for developing @apployees-nx/node itself:

1. In the angular.json file of this repo, change the `node` project:
    - Change `node:architect:build:builder` field to the value `@nrwl/node:build` instead of `@apployees-nx/node:build`.
    - Change `node:architect:build:options:main` field to the value `apps/node/src/builders/build/build.impl.ts`.
    - Change `node:architect:build:assets` to only have one entry: `apps/node/src`.
    - Notice that `node:architect:build:options:otherEntries` exists. This will be ignored by `@nrwl/node:build`, but will be used by `@apployees-nx/node:build` later on. So keep this entry.
1. Open `apps/node/src/builders.json` and change:
    - `builders:build:implementation` to be `"./main"`.
1. In a terminal, run `nx build node`.
1. Copy the `package.json` file from `apps/node` to `dist/apps/node`.
1. `cd dist/apps/node`
1. `yarn link`
1. Now go back to the root directory (`cd ../../..`) and run `yarn link "@apployees-nx/node"`.
1. Go back to angular.json file and revert your changes. That is:
    - You should have `@apployees-nx/node:build` for the `node:architect:build:builder` field.
    - You should have `apps/node/src/main.ts` for the `node:architect:build:options:main` field.
    - The `node:architect:build:assets` field should be just as before.
1. Go back to the `apps/node/src/builders.json` and revert your changes.
    - That is, `builders:build:implementation` should be `"./builder-build"`.
1. In a terminal of the repo root, run `nx build node`.
    - You have effectively built `@apployees-nx/node` using an `@nrwl/node`-builder-compiled version of `@apployees-nx/node` at this point.
    - Your dist folder now is a publish-able `@apployees-nx/node` package.
1. To develop `@apployees-nx/node`, run `yarn dev-node`. It will watch for changes and re-compile. Since it is already yarn-linked, you do not need to do anything else.
1. To build `@apployees-nx/node`, run `yarn build-node`.
1. You can now also build the rest of the apps with `@apployees-nx/node` if they require it, or the use the same process to bootstrap another builder if it requires it.
    - There are a few examples that use `@apployees-nx/node` in the examples directory you can play around with. Check out the package.json scripts for how to develop, run, and test them.

Note that an alternative to the above bootstrapping would have been to use the published version of `@apployees-nx/node` instead of `@nrwl/node`. That might actually be easier than above...but I wrote the above steps when I didn't even have a published builder initially.
