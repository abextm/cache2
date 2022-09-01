import * as fs from "fs";
import * as path from "path";

export class SourceWriter {
	private tabs: number;
	private parts: string[];
	private index: number;
	private isEOL: boolean;
	private name?: string;

	constructor(nameOrOther: string | SourceWriter) {
		if (typeof nameOrOther === "string") {
			this.name = nameOrOther;
			this.parts = [""];
			this.index = 0;
			this.tabs = 0;
			this.isEOL = true;
		} else if (nameOrOther instanceof SourceWriter) {
			let other = nameOrOther;
			other.parts.push("");
			this.parts = other.parts;
			this.index = other.index;
			this.tabs = other.tabs;
			this.isEOL = other.isEOL;
			other.index++;
		} else {
			throw new Error("must pass a string or SourceWriter");
		}
	}

	mark(): SourceWriter {
		return new SourceWriter(this);
	}

	indent(delta = 1): this {
		this.tabs += delta;
		if (this.tabs < 0) {
			throw new Error("Cannot outdent past zero");
		}
		return this;
	}
	outdent(delta = 1): this {
		this.indent(-delta);
		return this;
	}

	lf(count = 1): this {
		for (let i = 0; i < count; i++) {
			this.write("\n");
		}
		return this;
	}

	ws(): this {
		let s = this.parts[this.index];
		let c = s[s.length - 1];
		if (c != " " && c != "\n" && c != "\t") {
			this.write(" ");
		}
		return this;
	}

	maybeLF(): this {
		if (!this.isEOL) {
			this.lf();
		}
		return this;
	}

	write(s: string): this {
		for (let start = 0; start < s.length;) {
			let i = start;
			let char: string | undefined;
			for (; i < s.length; i++) {
				char = s.charAt(i);
				if (char == "\n" || char == "\r") {
					break;
				}
			}
			let append = s.substring(start, i);
			if (append.length > 0 && this.isEOL) {
				for (let i = 0; i < this.tabs; i++) {
					this.parts[this.index] += "\t";
				}
				this.isEOL = false;
			}
			this.parts[this.index] += append;
			switch (char) {
				case "\n":
					this.parts[this.index] += "\n";
					this.isEOL = true;
					i++;
					break;
				case "\r":
					i++;
					break;
			}
			start = i;
		}
		return this;
	}

	close() {
		if (!this.name) {
			return;
		}
		let p = path.join(process.argv[2], this.name);
		fs.mkdirSync(path.dirname(p), { recursive: true });
		fs.writeFileSync(p, this.parts.join(""));
	}
}
