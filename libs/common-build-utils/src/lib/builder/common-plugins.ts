/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import _ from "lodash";
import { IBuildBuilderOptions } from "../types/common-types";

export function getNotifierOptions(options: IBuildBuilderOptions) {
  const notifier = options.notifier;
  const defaultNotifierOptions = {
    excludeWarnings: false,
    alwaysNotify: false,
    skipFirstNotification: false,
    skipSuccessful: true,
  };
  const notifierOptions = _.isObject(notifier)
    ? _.extend({}, defaultNotifierOptions, notifier)
    : defaultNotifierOptions;
  return notifierOptions;
}
