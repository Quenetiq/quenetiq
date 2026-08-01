import { QuenetiqError } from './base';

export type ErrorFilter = (error: QuenetiqError) => boolean;
export type ErrorHandlerFn = (error: QuenetiqError) => boolean | void | Promise<boolean | void>;

export interface ErrorHandlerConfig {
	throwUnhandled?: boolean;
}

export class ErrorHandler {
	private handlers: { filter: ErrorFilter; handler: ErrorHandlerFn }[] = [];
	private readonly config: Required<ErrorHandlerConfig>;

	constructor(config?: ErrorHandlerConfig) {
		this.config = {
			throwUnhandled: config?.throwUnhandled ?? true,
		};
	}

	on(code: string | string[], handler: ErrorHandlerFn): this;
	on(filter: ErrorFilter, handler: ErrorHandlerFn): this;
	on(filter: string | string[] | ErrorFilter, handler: ErrorHandlerFn): this {
		if (typeof filter === 'function') {
			this.handlers.push({ filter, handler });
		} else {
			const codes = Array.isArray(filter) ? filter : [filter];
			this.handlers.push({
				filter: (e) => codes.includes(e.code),
				handler,
			});
		}
		return this;
	}

	async handle(error: unknown): Promise<boolean> {
		if (!(error instanceof QuenetiqError)) {
			return false;
		}
		for (const { filter, handler } of this.handlers) {
			if (filter(error)) {
				const result = await handler(error);
				if (result === false) {
					return false;
				}
			}
		}
		if (this.config.throwUnhandled) {
			throw error;
		}
		return true;
	}

	reset(): void {
		this.handlers = [];
	}
}
