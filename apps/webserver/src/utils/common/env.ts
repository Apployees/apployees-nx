/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { IBuildWebserverBuilderOptions } from "./webserver-types";
import {
  IProcessedEnvironmentVariables,
  getProcessedEnvironmentVariables,
  loadEnvironmentVariables,
} from "@apployees-nx/common-build-utils";
import { BuilderContext } from "@angular-devkit/architect";
import { existsSync, readFileSync } from "fs";

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

export function getAssetsUrl(options: IBuildWebserverBuilderOptions, withSlash: boolean = true) {
  return ensureSlash(process.env.ASSETS_URL || options.assetsUrl, withSlash);
}

export function getPublicUrl(options: IBuildWebserverBuilderOptions, withSlash: boolean = true) {
  return ensureSlash(
    process.env.PUBLIC_URL || options.publicUrl || process.env.ASSETS_URL || options.assetsUrl,
    withSlash,
  );
}

export function getWebserverEnvironmentVariables(
  options: IBuildWebserverBuilderOptions,
  context: BuilderContext,
  isEnvClient: boolean,
): IProcessedEnvironmentVariables {
  const envVars: any = loadEnvironmentVariables(options, context);

  if (options.dev) {
    envVars.HTTPS = options.devHttps;
    envVars.PORT = options.devAppPort ? options.devAppPort.toString() : "";
    envVars.HOST = options.devHost ? options.devHost : "localhost";

    if (options.devHttpsSslKey) {
      if (existsSync(options.devHttpsSslKey)) {
        envVars.HTTPS_KEY = readFileSync(options.devHttpsSslKey, "utf-8");
      } else {
        envVars.HTTPS_KEY = options.devHttpsSslKey;
      }
    }

    if (options.devHttpsSslCert) {
      if (existsSync(options.devHttpsSslCert)) {
        envVars.HTTPS_CERT = readFileSync(options.devHttpsSslCert, "utf-8");
      } else {
        envVars.HTTPS_CERT = options.devHttpsSslCert;
      }
    }
  }

  let keys = Object.keys(envVars);

  if (isEnvClient) {
    keys = keys.filter((key) => IN_CLIENT_PREFIX.test(key));
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

      // For example, <img src={env.ASSETS_URL + 'img/logo.png'} />.
      // This should only be used as an escape hatch. Normally you would put
      // images into the `src` and `import` them in code to get their paths.
      ASSETS_URL: getAssetsUrl(options, true),

      // The URL at which the server can be reached.
      // Also used to set the start_url in the manifest.json. Clients can also use this
      // to make API calls on the server.
      PUBLIC_URL: getPublicUrl(options, true),
    },
  );

  return getProcessedEnvironmentVariables(raw, isEnvClient ? "process.env" : "env");
}
