/**
 * Normally, you would use the .env files provided in the ../envs folder
 * to declare all your environment variables for development and production.
 *
 * The only purpose this file serves is to show how you can do file replacements
 * during build time.
 *
 * For example, you can do file replacement such that SSR only happens for
 * production builds, by replacing your root component .tsx file with another
 * file that is a blank <div>Loading</div> React component. Doing so will
 * significantly improve development build times, as changing any UI code will
 * only rebuild the client webpack, not server webpack.
 */
export const MyObject = {
  someKey: "value at development"
};
