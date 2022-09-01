import * as fs from "fs";
import * as path from "path";
import * as data from "./data";

const root = process.argv[2];
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });

const configPath = path.join(root, "configs");
fs.mkdirSync(configPath);
for (let key in data.configs) {
	const json = JSON.stringify(data.configs[key], undefined, "\t");
	fs.writeFileSync(path.join(configPath, `${key}.json`), json);
}
