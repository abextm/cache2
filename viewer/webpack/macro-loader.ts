import * as webpack from "webpack";

export const pitch: webpack.PitchLoaderDefinitionFunction = async function(remaining, preceding) {
	if (this.resourceQuery.includes("nomacro=true")) {
		return;
	}
	let query = this.resourceQuery;
	query += query ? "&" : "?";
	query += "nomacro=true";
	const module = await this.importModule(
		`${this.resourcePath}${query}${this.resourceFragment}`,
		{
			...this.getOptions(),
			publicPath: "!!invalid!!",
		},
	);

	let code = Object.entries(module)
		.filter(([k, _v]) => !/__type$/.test(k))
		.map(([k, v]) => {
			let type = module[`${k}__type`];
			if (type) {
				type = ` : ${type}`;
			} else {
				type = "";
			}
			return `export const ${k}${type} = ${JSON.stringify(v)};`;
		})
		.join("\n");
	return code;
};
