import { libFileMap } from "./libfs.macro";

export const libFileSet__type = "Record<string, boolean>";
export const libFileSet = Object.fromEntries(Object.keys(libFileMap).map(k => [k, true]));
