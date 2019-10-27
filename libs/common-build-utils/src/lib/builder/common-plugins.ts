import _ from "lodash";
import { BuildBuilderOptions } from "../types/common-types";
import { CleanWebpackPlugin } from "clean-webpack-plugin";

export function getNotifierOptions(options: BuildBuilderOptions) {
  const notifier = options.notifier;
  const defaultNotifierOptions = {
    excludeWarnings: false,
    alwaysNotify: false,
    skipFirstNotification: false,
    skipSuccessful: true
  };
  const notifierOptions = _.isObject(notifier) ?
    _.extend({}, defaultNotifierOptions, notifier) : defaultNotifierOptions;
  return notifierOptions;
}

export function getCleanPlugin(options: BuildBuilderOptions) {
  return new CleanWebpackPlugin({
    cleanStaleWebpackAssets: false
  });
}
