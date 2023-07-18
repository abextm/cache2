import { Compiler, RuntimeGlobals, RuntimeModule } from "webpack";

class StatusRuntimeModule extends RuntimeModule {
	constructor() {
		super("ensure chunk status hook");
	}

	override generate() {
		return `${RuntimeGlobals.ensureChunk} = (ensureChunk => {
			let status = ${RuntimeGlobals.require}.status = {
				loading: 0,
				onChange: () => {},
			};
			return (...args) => {
				status.onChange(++status.loading, false);
				return ensureChunk(...args).finally(() =>
					status.onChange(--status.loading, true));
			};
		})(${RuntimeGlobals.ensureChunk})`;
	}
}

export class StatusPlugin {
	apply(compiler: Compiler) {
		compiler.hooks.compilation.tap("StatusPlugin", compilation => {
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunk)
				.tap("StatusPlugin", chunk => {
					compilation.addRuntimeModule(chunk, new StatusRuntimeModule());
				});
		});
	}
}
