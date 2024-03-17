import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as path from "path";
import sveltePreprocess from "svelte-preprocess";
import TerserPlugin from "terser-webpack-plugin";
import * as webpack from "webpack";
import StartupChunkDependenciesPlugin from "webpack/lib/runtime/StartupChunkDependenciesPlugin";
import "webpack-dev-server";
import * as ts from "typescript";
import { addTypeInfo } from "../../cache2-ts/reflect";
import { StatusPlugin } from "./status";

const tsLoader = path.resolve(__dirname, "dts-loader.ts");
let dist = path.resolve(__dirname, "../dist");

let dev = process.env.NODE_ENV != "production";

let tsOpts = {
	getCustomTransformers(program: ts.Program) {
		return {
			before: [
				addTypeInfo(ts, program),
			],
		};
	},
};

let config: webpack.Configuration = {
	context: path.resolve(__dirname, "../"),
	mode: dev ? "development" : "production",
	devtool: "source-map",
	entry: {
		main: {
			import: [
				"./src/main/main.ts",
				"./src/main/main.scss",
			],
		},
		worker: {
			chunkLoading: "import-scripts",
			import: "./src/status/worker.ts",
		},
	},
	output: {
		globalObject: "self",
		filename: "[name].js",
		path: dist,
		clean: true,
		chunkLoading: "jsonp",
	},
	resolve: {
		alias: {
			svelte: path.resolve(__dirname, "../../node_modules/svelte"),
			"@abextm/cache2": path.resolve(__dirname, "../../cache2-ts/src"),
		},
		fallback: {
			perf_hooks: false,
		},
		extensions: [".ts", ".js", ".svelte"],
		mainFields: ["svelte", "browser", "module", "main"],
	},
	module: {
		rules: [
			{
				test: /\.svelte$/,
				loader: "svelte-loader",
				options: {
					compilerOptions: {
						dev: false, // very slow event dispatching
					},
					emitCss: true,
					preprocess: sveltePreprocess({
						typescript: {
							tsconfigFile: path.resolve(__dirname, "../tsconfig.json"),
							compilerOptions: {
								// should match tsconfig.base.json
								target: "ES2022",
							},
						},
						babel: false,
					}),
					onwarn(warning, handle) {
						if (!warning.code.startsWith("a11y-")) {
							handle(warning);
						}
					},
				},
			},
			{
				// https://github.com/sveltejs/svelte-loader#usage
				test: /node_modules\/svelte\/.*\.mjs$/,
				resolve: {
					fullySpecified: false,
				},
			},
			{
				test: /\.s?[ac]ss$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
					},
					"css-loader",
					"sass-loader",
				],
			},
			{
				test: /\.ttf$/,
				type: "asset/resource",
			},
			{
				test: /node_modules\/typescript\/.*\.d\.ts$/,
				loader: "raw-loader",
			},
			{
				test: /\.[jt]sx?/,
				oneOf: [{
					exclude: /node_modules/,
					loader: tsLoader,
					options: {
						...tsOpts,
						configFile: path.resolve(__dirname, "../tsconfig.json"),
						instance: "main",
					},
				}, {
					resourceQuery: /dts$/,
					loader: tsLoader,
					options: {
						...tsOpts,
						configFile: path.resolve(__dirname, "../tsconfig.json"),
						instance: "main",
					},
				}],
			},
			{
				test: /\.macro\.[tj]s/,
				loader: path.resolve(__dirname, "macro-loader.ts"),
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "[name].css",
		}),
		// enable chunk splitting for sync imports
		new StartupChunkDependenciesPlugin({
			chunkLoading: "jsonp",
		}),
		new StatusPlugin(),
	],
	optimization: {
		minimize: !dev,
		splitChunks: {
			chunks: "all",
			minSize: 50_000,
			maxSize: 10_000_000,
			minSizeReduction: 25_0000,
		},
		minimizer: [
			new TerserPlugin({
				extractComments: false,
				terserOptions: {
					compress: {
						ecma: 2020,
					},
				},
			}),
			new CssMinimizerPlugin(),
		],
	},
	performance: {
		maxEntrypointSize: 10_000_000,
		maxAssetSize: 10_000_000,
	},
	devServer: {
		compress: true,
		port: 9000,
		server: "https",
		client: {
			logging: "none",
			overlay: {
				errors: true,
				runtimeErrors: false,
				warnings: false,
			},
		},
	},
	ignoreWarnings: [{
		module: /Runner.ts/,
		message: /dependency is an expression/,
	}, {
		module: /node_modules\/typescript/,
		message: /dependency is an expression/,
	}],
	experiments: {
		topLevelAwait: true,
	},
};
export default config;
