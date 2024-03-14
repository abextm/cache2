// @ts-ignore
import { files as viewerContextDTS } from "../context?dts";
// @ts-ignore
import { files as fshDTS } from "@types/wicg-file-system-access/index.d.ts?dts";
// @ts-ignore
import { files as lodashDTS } from "@types/lodash/index.d.ts?dts";

// so typescript retains types data to console.log
const genericConsole = `
interface Console {
	/* @TypedCall */ debug<T extends any[]>(...data: T): void;
	/* @TypedCall */ error<T extends any[]>(...data: T): void;
	/* @TypedCall */ info<T extends any[]>(...data: T): void;
	/* @TypedCall */ log<T extends any[]>(...data: T): void;
	/* @TypedCall */ trace<T extends any[]>(...data: T): void;
	/* @TypedCall */ warn<T extends any[]>(...data: T): void;
}

declare var console: Console;
`;

let libContext = require.context("typescript/lib/", false, /lib\..*\.d\.ts/);
const libDTS = Object.fromEntries(libContext.keys().map(k => [k.substring(2), libContext(k).default]));

export const libFileMap__type = "Record<string, string>";
export const libFileMap: Record<string, string> = {
	...libDTS,
	...fshDTS,
	...viewerContextDTS,
	...lodashDTS,
	"lib.genericconsole.d.ts": genericConsole,
};
