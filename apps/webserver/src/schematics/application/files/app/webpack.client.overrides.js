const path = require("path");

module.exports = function override(config, { options, configuration }) {
  /**
   * AntD currently has a problem where it bundles all the SVG icons even
   * the ones that are not being used by the imports in your code:
   *
   * See https://github.com/ant-design/ant-design/issues/12011
   *
   * This is a workaround to that problem as per:
   * https://github.com/zeit/next.js/issues/4101#issuecomment-456719039
   */
  config.resolve.alias["@ant-design/icons/lib/dist$"] = path.join(__dirname, "antd-icons.js");

  return config;
};
