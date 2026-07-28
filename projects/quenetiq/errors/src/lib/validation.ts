import { QuenetiqError } from './base';

export enum ValidationErrorCode {
	MISSING_VARIABLES = 'VALIDATION_MISSING_VARIABLES',
	INVALID_QUERY = 'VALIDATION_INVALID_QUERY',
	TYPE_MISMATCH = 'VALIDATION_TYPE_MISMATCH',
	MALFORMED_RESPONSE = 'VALIDATION_MALFORMED_RESPONSE',
}

export class ValidationError extends QuenetiqError {
	constructor(code: ValidationErrorCode, message: string, context?: Record<string, unknown>) {
		super(message, code, context);
		this.name = 'ValidationError';
	}
}
