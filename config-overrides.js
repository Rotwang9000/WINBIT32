const webpack = require("webpack");
const path = require("path");


module.exports = function override(config) {
	const fallback = config.resolve.fallback || {};
	Object.assign(fallback, {
		buffer: require.resolve("buffer/"),
		crypto: require.resolve("crypto-browserify"),
		stream: require.resolve("stream-browserify"),
		path: require.resolve("path-browserify"),
		assert: require.resolve("assert"),
		http: false, // require.resolve("stream-http")
		https: false, // require.resolve("https-browserify")
		os: false, // require.resolve("os-browserify")
		url: false, // require.resolve("url")
		zlib: require.resolve("browserify-zlib"),
		vm: require.resolve("vm-browserify"),
		fs: false,
		util: false, //require.resolve("util/"),
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
		asyncWebAssembly: false,
		syncWebAssembly: true,
		lazyCompilation: {
			// disable lazy compilation for dynamic imports
			imports: false,

			// disable lazy compilation for entries
			entries: false,

			// do not lazily compile moduleB
			test: (module) =>
				!/secp256k1/.test(
					module.memory
				),
		},
	};

	return config;
};

