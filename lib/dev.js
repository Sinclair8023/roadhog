'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = runDev;

var _path = require('path');

var _dev = _interopRequireDefault(require('af-webpack/dev'));

var _buildStatisticsWebpackPlugin = _interopRequireDefault(
  require('build-statistics-webpack-plugin'),
);

var _bigbrotherWebpackPlugin = _interopRequireDefault(
  require('bigbrother-webpack-plugin'),
);

var _chalk = _interopRequireDefault(require('chalk'));

var _umiNotify = _interopRequireDefault(require('umi-notify'));

var _getUserConfig = _interopRequireWildcard(
  require('af-webpack/getUserConfig'),
);

var _getWebpackConfig = _interopRequireDefault(require('./getWebpackConfig'));

var _getPaths = _interopRequireDefault(require('./getPaths'));

var _registerBabel = _interopRequireDefault(require('./registerBabel'));

var _mock = require('./utils/mock');

function _getRequireWildcardCache() {
  if (typeof WeakMap !== 'function') return null;
  var cache = new WeakMap();
  _getRequireWildcardCache = function _getRequireWildcardCache() {
    return cache;
  };
  return cache;
}

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return { default: obj };
  }
  var cache = _getRequireWildcardCache();
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

const debug = require('debug')('roadhog:dev');

function once(fn) {
  if (!fn.__runned) {
    fn.__runned = true;
    fn();
  }
}

function runDev(opts = {}) {
  _umiNotify.default.onDevStart({
    name: 'roadhog',
    version: '2-beta',
  });

  const _opts$cwd = opts.cwd,
    cwd = _opts$cwd === void 0 ? process.cwd() : _opts$cwd,
    entry = opts.entry;
  const babel = (0, _path.resolve)(__dirname, './babel.js');
  const paths = (0, _getPaths.default)(cwd); // register babel for config files

  (0, _registerBabel.default)(babel, {
    cwd,
    configOnly: true,
  }); // get user config

  let config = null;
  let returnedWatchConfig = null;

  try {
    const configObj = (0, _getUserConfig.default)({
      cwd,
    });
    config = configObj.config;
    returnedWatchConfig = configObj.watch;
    debug(`user config: ${JSON.stringify(config)}`);
  } catch (e) {
    console.error(_chalk.default.red(e.message));
    debug('Get .webpackrc config failed, watch config and reload'); // 监听配置项变更，然后重新执行 dev 逻辑

    (0, _getUserConfig.watchConfigs)().on('all', (event, path) => {
      debug(`[${event}] ${path}, unwatch and reload`);
      (0, _getUserConfig.unwatchConfigs)();
      runDev(opts);
    });
    return;
  } // get webpack config

  const webpackConfig = (0, _getWebpackConfig.default)({
    cwd,
    config,
    babel,
    paths,
    entry,
  });
  const stagesPath = (0, _path.join)(
    __dirname,
    '../.run/build-statistics/compilation.json',
  );

  const roadhogPkg = require((0, _path.join)(__dirname, '../package.json')); // eslint-disable-line

  webpackConfig.plugins.push(
    new _buildStatisticsWebpackPlugin.default({
      path: stagesPath,
    }),
    new _bigbrotherWebpackPlugin.default({
      cwd,
      tool: {
        name: 'roadhog',
        version: roadhogPkg.version,
        stagesPath,
      },
    }),
  );

  function onCompileDone() {
    _umiNotify.default.onDevComplete({
      name: 'roadhog',
      version: '2-beta',
    });
  }

  (0, _dev.default)({
    webpackConfig,
    proxy: config.proxy || {},

    beforeServer(devServer) {
      try {
        (0, _mock.applyMock)(devServer);
      } catch (e) {
        console.log(e);
      }
    },

    afterServer(devServer) {
      returnedWatchConfig(devServer);
    },

    openBrowser: true,

    onCompileDone() {
      once(onCompileDone);
    },
  });
}
