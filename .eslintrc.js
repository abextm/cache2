module.exports = {
	root: true,
	ignorePatterns: [
		"dist",
		"build",
		"cache2-ts/src/generated",
		"*.out.js",
	],
	env: {
		node: true,
		browser: true,
	},
	parser: "@typescript-eslint/parser",
	plugins: [
		"@typescript-eslint",
	],
	overrides: [{
		files: ["*.svelte"],
		parser: "svelte-eslint-parser",
		parserOptions: {
			parser: "@typescript-eslint/parser",
		},
	}],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:svelte/recommended",
	],
	rules: {
		"@typescript-eslint/no-explicit-any": "off",
		"prefer-const": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-unused-vars": ["warn", {
			args: "none",
			varsIgnorePattern: "_",
		}],
		"no-cond-assign": "off",
		"@typescript-eslint/no-namespace": "off",
		"@typescript-eslint/ban-ts-comment": "off",
		"no-control-regex": "off",
		"no-inner-declarations": "off",
		"svelte/no-inner-declarations": "off",
		"@typescript-eslint/no-this-alias": "off",
		"@typescript-eslint/no-empty-function": ["error", {
			allow: ["constructors"],
		}],
		"no-self-assign": "off", // svelte requires this
	},
};
