import * as hitsplat from "./datas/hitsplat";
import * as item from "./datas/item";
import * as npc from "./datas/npc";
import { Config } from "./def";

export const configs: { [name: string]: Config; } = {
	item: item.config,
	hitsplat: hitsplat.config,
	npc: npc.config,
};
