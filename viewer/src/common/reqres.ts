export interface Request {
	type: string;
	id: number;
	args: any[];
}

export type Response =
	& {
		id: number;
	}
	& ({
		error: ErrorMessage;
	} | {
		value: any;
	});

export interface ErrorMessage {
	name: string;
	message: string;
	stack: string;
}
