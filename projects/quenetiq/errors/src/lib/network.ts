import { QuenetiqError } from './base';

export enum NetworkErrorCode {
	TIMEOUT = 'NETWORK_TIMEOUT',
	OFFLINE = 'NETWORK_OFFLINE',
	HTTP_ERROR = 'HTTP_ERROR',
	DNS_ERROR = 'DNS_ERROR',
	ABORTED = 'NETWORK_ABORTED',
	UNKNOWN = 'NETWORK_UNKNOWN',
}

export class NetworkError extends QuenetiqError {
	public readonly statusCode?: number;
	public readonly statusText?: string;

	constructor(
		code: NetworkErrorCode,
		message: string,
		options?: {
			statusCode?: number;
			statusText?: string;
			context?: Record<string, unknown>;
		},
	) {
		super(message, code, options?.context);
		this.name = 'NetworkError';
		this.statusCode = options?.statusCode;
		this.statusText = options?.statusText;
	}
}
