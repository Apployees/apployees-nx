import { BuildWebserverBuilderOptions } from "./webserver-types";
import {
  ProcessedEnvironmentVariables,
  getProcessedEnvironmentVariables, loadEnvironmentVariables
} from "@apployees-nx/common-build-utils";
import { BuilderContext } from "@angular-devkit/architect";


// Grab NODE_ENV and CLIENT_ONLY_* environment variables and prepare them to be
// injected into the application via DefinePlugin in Webpack configuration.
const IN_CLIENT_PREFIX = /^IN_CLIENT_/i;

export function ensureSlash(inputPath, needsSlash) {
  const _inputPath = inputPath || "";
  const hasSlash = _inputPath.endsWith("/");
  if (hasSlash && !needsSlash) {
    return _inputPath.substr(0, _inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${_inputPath}/`;
  } else {
    return _inputPath;
  }
}

export function getAssetsUrl(
  options: BuildWebserverBuilderOptions,
  withSlash: boolean = true) {

  return ensureSlash(
    options.dev ?
      options.assetsUrl :
      process.env.ASSETS_URL || options.assetsUrl,
    withSlash);
}

export function getWebserverEnvironmentVariables(
  options: BuildWebserverBuilderOptions,
  context: BuilderContext,
  isEnvClient: boolean): ProcessedEnvironmentVariables {

  const envVars = loadEnvironmentVariables(options, context);
  let keys = Object.keys(envVars);

  if (isEnvClient) {
    keys = keys.filter(key => IN_CLIENT_PREFIX.test(key));
  }

  const raw = keys.reduce(
      (env, key) => {
        env[key] = envVars[key];
        return env;
      },
      {
        // Useful for determining whether we’re running in production mode.
        // Most importantly, it switches React into the correct mode.
        NODE_ENV: options.dev ? "development" : "production",

        // whether we are running on client or server
        RENDER_ENV: isEnvClient ? "client" : "server",

        // TODO: Don't know why this is necessary...remove?
        //  Useful for changing the port that the app server runs on.
        PORT: options.devAppPort ? options.devAppPort.toString() : "",


        // Useful for resolving the correct path to static assets in `public`.
        // For example, <img src={env.ASSETS_URL + '/img/logo.png'} />.
        // This should only be used as an escape hatch. Normally you would put
        // images into the `src` and `import` them in code to get their paths.
        ASSETS_URL: getAssetsUrl(options, false)
      }
    );

  return getProcessedEnvironmentVariables(raw, "env");
}
