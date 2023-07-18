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
	mode: dev ? "development" : "production",
	devtool: "source-map",
	entry: {
		...(((workers: any) => {
			for (let key in workers) {
				let worker = workers[key];
				if (typeof worker === "string") {
					worker = {
						import: worker,
					};
				}
				if (typeof worker.import === "string") {
					worker.import = [worker.import];
				}
				worker.import.push("./src/common/status.ts");
				workers[key] = {
					chunkLoading: "import-scripts",
					...worker,
				};
			}
			return workers;
		})({
			Runner: "./src/runner/Runner.ts",
			"mw/editor": "monaco-editor/esm/vs/editor/editor.worker.js",
			"mw/json": "monaco-editor/esm/vs/language/json/json.worker",
			"mw/ts": {
				import: [
					"monaco-editor/esm/vs/language/typescript/ts.worker",
					"./src/tspatch/tspatch.ts",
				],
			},
		})),
		main: {
			import: [
				"./src/main/main.ts",
				"./src/main/main.scss",
			],
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
			cache2: path.resolve(__dirname, "../../cache2-ts/src"),
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
							tsconfigFile: path.resolve(__dirname, "../src/main/tsconfig.json"),
							compilerOptions: {
								// should match tsconfig.base.json
								target: "ES2020",
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
				test: /\.[jt]sx?/,
				oneOf: [{
					test: /src\/main\/.*\.tsx?$/,
					loader: tsLoader,
					exclude: /node_modules/,
					options: {
						...tsOpts,
						configFile: path.resolve(__dirname, "../src/main/tsconfig.json"),
						instance: "main",
					},
				}, {
					// test: /src\/(common|runner|tspatch)\/.*\.tsx?$/,
					loader: tsLoader,
					exclude: /node_modules/,
					options: {
						...tsOpts,
						configFile: path.resolve(__dirname, "../tsconfig.json"),
						instance: "worker",
					},
				}, {
					resourceQuery: /dts/,
					loader: tsLoader,
					options: {
						...tsOpts,
						configFile: path.resolve(__dirname, "../tsconfig.json"),
						instance: "worker",
					},
				}],
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
	devServer: {
		compress: true,
		port: 9000,
		server: "https",
	},
	ignoreWarnings: [{
		module: /Runner.ts/,
		message: /dependency is an expression/,
	}],
	experiments: {
		topLevelAwait: true,
	},
};
export default config;
