import { libFileMap } from "./libfs";

export const libFileSet = Object.fromEntries(Object.keys(libFileMap).map(k => ([k, true])))
