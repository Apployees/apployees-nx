# Why not Babel?

I experimented with Babel quite a bit for the `webserver`, but came to the conclusion that it is not worth it when feeding it Typescript code. There are
many limitations when using Babel with Typescript, as of December 2019. This document briefly talks about that.

> For a complete up-to-date list of Babel limitations with Typescript, see this page [https://babeljs.io/docs/en/babel-plugin-transform-typescript](https://babeljs.io/docs/en/babel-plugin-transform-typescript).

> For reference to the Typescript compiler flags talked about below, see this page: [https://www.typescriptlang.org/docs/handbook/compiler-options.html](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

## Babel's namespace support is really, really broken.

- You have to turn on namespace support using experimental flag `allowNamespaces` first.

- You can't export a type or another import at all. You have to turn them into `const` -- but then you cannot use a `const` as a type (e.g. you cannot import a constant from a
  namespace and use it to extend a class). Also, because of this, you cannot export interfaces from namespaces. This is by far the biggest problem I have with Babel. It means
  all the neat organization of constants and interfaces that make up different modules or layers in your application cannot be used with Babel.

- Referring to other declarations in the same namespace doesn't work -- you always have to prefix with the namespace name. Imagine new developers reading Typescript documentation
  then getting all confused as to why things don't work according to the documentation.

- Babel does not compile namespaces across files. This will probably never get fixed because
  Babel's very premise is to compile modules individually. Because of this limitation, we have to turn on `isolatedModules` on for Typescript compiler. This brings
  very confusing issues like not being able to have a file that doesn't have any imports or exports. For example, let's say you want a second client entry file that all it does
  is print something to the console, or is a service worker that does not require any imports and does not do any exports, or even an entry that fetches polyfills from a CDN and
  so does not have any exports or imports. You can't.

## Decorator implementations are incompatible with tsc and incompletely implemented

- [List of all open decorator issues in Babel.](https://github.com/babel/babel/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+decorators)
- Typescript decorators are using Stage 2 Proposal for decorators -- the current stage, but that stage is already `legacy` for Babel compiler. So you turn on the `legacy`  
  flag on the `@babel/plugin-proposal-decorators` plugin, but even then your decorator implementation that worked with tsc doesn't work with Babel. It seems that with Babel, any changes
  to the prototype that you make (such as deleting an existing property and adding another one) does not work inside your decorator function.

- [Decorating class properties is broken.](https://github.com/babel/babel/issues/7373)

- Decorating function parameters is not even supported by the Babel decorator plugin. It is supported by [this one](babel-plugin-parameter-decorator), which has its own issues.

- Emitting Typescript metadata is not officially supported...[another third-party plugin.](https://github.com/leonardfactory/babel-plugin-transform-typescript-metadata#readme)
  This plugin has its own set of major issues that messes with official decorator plugin functionality -- see [https://github.com/leonardfactory/babel-plugin-transform-typescript-metadata/issues](https://github.com/leonardfactory/babel-plugin-transform-typescript-metadata/issues).

## Complexity and Configuration Hell

- With so many different plugins for Babel, each with their configurations and each affecting other plugin's output and functionality, building a compiler toolchain that is
  deterministic after an upgrade of any one plugin seems impossible. As a matter of fact, if you peruse through the issues of any repo that is using Babel (or go through Babel's issues itself or the
  issues of any its plugins), you will find many people unable to upgrade a buggy plugin because it either breaks existing plugins or it doesn't work with existing plugins.

- There will always be a new feature in Typescript that either gets incompletely supported or work differently than the Typescript handbook documentation. You will have to keep tweaking
  the compiler toolchain. You should strive to build applications based on stable language features and for which upgrading compilers has a clear migration path. This requires a great deal
  of uniformity and planning of language features.

- When yarn or npm tries to install multiple versions of the same Babel plugins into your node_modules folder (perhaps because packageA depends on version X of plugin-foo but packageB depends on
  version Y of plugin-foo), the babel-loader can get very confused and throw a fit. I think this has to do with either the babel loader bug of not using the resolver correctly, and in some cases
  some plugins overriding the resolver behaviour. You will start getting weird module not loaded errors even when modules are there somewhere in node_modules, just not where the packageA or packageB
  are looking.

- Often times, what's supposed to work out-of-the-box needs to be configured. Take for example source maps. If you turn on source-maps in Typescript compiler, even your
  error stack traces are source-mapped. Not with Babel. There's a plugin for that, and yes, it has issues.

## Substituting the Babel Advantage

No doubt, the biggest advantage of Babel is being able to plugin your own code transformers into the compiler toolchain. This has allowed for some neat tricks, especially around string literal templates.

Typescript (/ ts-loader) now supports code transformers, so you can achieve the same effect. For example, I substituted babel-import-helper (a plugin that transforms monolithic library imports into individual
component imports to reduce output size) with a Typescript transformer that does the exact same thing.

## Performance

I have no empirical evidence though but my gut feeling says that by introducing another layer such as Babel, you will pay performance penalties on compilation times.

# Moving back to Babel

If we ever want to move back to Babel, the code for Babel's configuration is commented out in [common-loaders.ts](../apps/webserver/src/utils/common/common-loaders.ts).

Also, here are all the babel plugins that need to be added to package.json:

```json
{
  "dependencies": {
    "@babel/core": "7.7.4",
    "@babel/plugin-proposal-class-properties": "7.7.4",
    "@babel/plugin-proposal-decorators": "7.7.4",
    "@babel/plugin-transform-runtime": "7.7.4",
    "@babel/preset-env": "7.7.4",
    "@babel/preset-react": "7.7.4",
    "@babel/preset-typescript": "7.7.4",
    "@babel/runtime": "7.7.4",
    "babel-loader": "8.0.6",
    "babel-plugin-dynamic-import-node": "^2.3.0",
    "babel-plugin-import": "^1.12.2",
    "babel-plugin-macros": "2.6.1",
    "babel-plugin-named-asset-import": "^0.3.4",
    "babel-plugin-parameter-decorator": "^1.0.12",
    "babel-plugin-source-map-support": "^2.1.1",
    "babel-plugin-styled-components": "^1.10.6",
    "babel-plugin-transform-async-to-promises": "0.8.14",
    "babel-plugin-transform-typescript-metadata": "^0.2.2"
  }
}
```

You will also need to add the following dependencies to the package.json in the webserver plugin,
because these are implicit dependencies that do not get picked up by the package.json generator. Make sure
to use the same version as the dependencies in the root package.json as shown above.

```json
{
  "dependencies": {
    "@babel/core": "^7.6.0",
    "@babel/plugin-transform-runtime": "^7.6.2",
    "@babel/runtime": "^7.6.3",
    "babel-loader": "^8.0.6",
    "babel-plugin-import": "^1.12.2",
    "babel-plugin-transform-async-to-promises": "^0.8.14"
  }
}
```
