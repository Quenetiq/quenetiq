export class QuenetiqError extends Error {
	public readonly code: string;
	public readonly timestamp: string;
	public readonly context?: Readonly<Record<string, unknown>>;

	constructor(message: string, code: string, context?: Record<string, unknown>) {
		super(message);
		this.name = 'QuenetiqError';
		this.code = code;
		this.timestamp = new Date().toISOString();
		this.context = context;
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			timestamp: this.timestamp,
			context: this.context,
			stack: this.stack,
		};
	}
}
