
let libContext = require.context("typescript/lib/", false, /lib\..*\.d\.ts/);
const libDTS = Object.fromEntries(libContext.keys().map(k => [k.substring(2), libContext(k).default]));

export const libFileMap: Record<string, string> = {
	...libDTS,
};
