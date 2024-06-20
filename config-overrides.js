const webpack = require("webpack");

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
	path: require.resolve("path-browserify"),
    assert: false, // require.resolve("assert") 
    http: false, // require.resolve("stream-http") 
    https: false, // require.resolve("https-browserify") 
    os: false, // require.resolve("os-browserify") 
    url: false, // require.resolve("url") 
    zlib: false, // require.resolve("browserify-zlib") 
    vm: require.resolve("vm-browserify"),
    fs: false
  });
  config.resolve.fallback = fallback;
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ]);
  config.ignoreWarnings = [/Failed to parse source map/];
  config.module.rules.push({
    test: /\.(js|mjs|jsx)$/,
    enforce: "pre",
    loader: require.resolve("source-map-loader"),
    resolve: {
      fullySpecified: false,
    },
  });
	  config.experiments = {
		asyncWebAssembly: true,
		syncWebAssembly: false,

	};
  return config;
};
