import webpack from "webpack";

class StatusRuntimeModule extends webpack.RuntimeModule {
	constructor() {
		super("ensure chunk status hook");
	}

	override generate() {
		return `${webpack.RuntimeGlobals.ensureChunk} = (ensureChunk => {
			let status = ${webpack.RuntimeGlobals.require}.status = {
				loading: 0,
				onChange: () => {},
			};
			return (...args) => {
				status.onChange(++status.loading, false);
				return ensureChunk(...args).finally(() =>
					status.onChange(--status.loading, true));
			};
		})(${webpack.RuntimeGlobals.ensureChunk})`;
	}
}

export class StatusPlugin {
	apply(compiler: webpack.Compiler) {
		compiler.hooks.compilation.tap("StatusPlugin", compilation => {
			compilation.hooks.runtimeRequirementInTree
				.for(webpack.RuntimeGlobals.ensureChunk)
				.tap("StatusPlugin", chunk => {
					compilation.addRuntimeModule(chunk, new StatusRuntimeModule());
				});
		});
	}
}
