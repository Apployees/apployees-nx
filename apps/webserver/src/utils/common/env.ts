import { BuildWebserverBuilderOptions } from './webserver-types';


// Grab NODE_ENV and REACT_APP_* environment variables and prepare them to be
// injected into the application via DefinePlugin in Webpack configuration.
const REACT_APP = /^REACT_APP_/i;

export function ensureSlash(inputPath, needsSlash) {
  const _inputPath = inputPath || "";
  const hasSlash = _inputPath.endsWith('/');
  if (hasSlash && !needsSlash) {
    return _inputPath.substr(0, _inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${_inputPath}/`;
  } else {
    return _inputPath;
  }
}

export function getPublicUrl(
  options: BuildWebserverBuilderOptions,
  withSlash: boolean = true) {

  return ensureSlash(
    options.dev ?
      options.publicUrl :
      process.env.PUBLIC_URL || options.publicUrl,
    withSlash);
}

export function getClientEnvironment(options: BuildWebserverBuilderOptions) {
  const raw = Object.keys(process.env)
    .filter(key => REACT_APP.test(key))
    .reduce(
      (env, key) => {
        env[key] = process.env[key];
        return env;
      },
      {
        // Useful for determining whether we’re running in production mode.
        // Most importantly, it switches React into the correct mode.
        NODE_ENV: process.env.NODE_ENV || (options.dev ? 'development' : 'production'),
        // Useful for changing the port that the app server runs on.
        PORT: process.env.PORT || (options.devAppPort ? options.devAppPort.toString() : ''),
        // Useful for resolving the correct path to static assets in `public`.
        // For example, <img src={process.env.ASSETS_PATH + '/img/logo.png'} />.
        // This should only be used as an escape hatch. Normally you would put
        // images into the `src` and `import` them in code to get their paths.
        ASSETS_PATH: getPublicUrl(options, false),
      }
    );
  // Stringify all values so we can feed into Webpack DefinePlugin
  const stringified = {
    'process.env': Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
  };

  return { raw, stringified };
}
