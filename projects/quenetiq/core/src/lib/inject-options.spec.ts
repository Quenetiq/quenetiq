import { describe, it, expect } from 'vitest';
import { toInjectOptions, type QuenetiqInjectOptions } from './inject-options';

describe('toInjectOptions', () => {
	it('returns an empty object for undefined options', () => {
		expect(toInjectOptions(undefined)).toEqual({});
	});

	it('returns an empty object for empty options', () => {
		expect(toInjectOptions({})).toEqual({});
	});

	it('forwards only DI-related flags', () => {
		const options: QuenetiqInjectOptions & { streamOn?: boolean; document?: string } = {
			optional: true,
			self: false,
			skipSelf: true,
			host: true,
			streamOn: true,
			document: 'query',
		};
		expect(toInjectOptions(options)).toEqual({
			optional: true,
			self: false,
			skipSelf: true,
			host: true,
		});
	});

	it('does not leak feature options into inject()', () => {
		const result = toInjectOptions({ optional: true, streamOn: true, skip: false });
		expect(result).toEqual({ optional: true });
		expect('streamOn' in result).toBe(false);
		expect('skip' in result).toBe(false);
	});

	it('omits undefined flags', () => {
		const result = toInjectOptions({ optional: true, self: undefined });
		expect(result).toEqual({ optional: true });
	});
});
