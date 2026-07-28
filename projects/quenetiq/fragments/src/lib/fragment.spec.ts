import { describe, it, expect } from 'vitest';
import { fragment, getFragment, spread, compose, useFragment } from './fragment';

describe('fragment', () => {
	it('creates a FragmentDefinition from a template string', () => {
		const frag = fragment`fragment Foo on Bar { id name }`;
		expect(frag.name).toBe('Foo');
		expect(frag.document.kind).toBe('Document');
	});

	it('throws on non-fragment definitions', () => {
		expect(() => fragment`query { foo }`).toThrow('No fragment definition found');
	});
});

describe('getFragment', () => {
	it('returns the DocumentNode', () => {
		const frag = fragment`fragment F on Q { id }`;
		const doc = getFragment(frag);
		expect(doc.kind).toBe('Document');
		expect(doc).toBe(frag.document);
	});
});

describe('spread', () => {
	it('returns the fragment spread syntax', () => {
		const frag = fragment`fragment X on Y { z }`;
		expect(spread(frag)).toBe('...X');
	});
});

describe('compose', () => {
	it('combines multiple fragments into one DocumentNode', () => {
		const a = fragment`fragment A on X { a }`;
		const b = fragment`fragment B on Y { b }`;
		const doc = compose(a, b);
		expect(doc.definitions).toHaveLength(2);
	});
});

describe('useFragment', () => {
	it('returns data when data is not null', () => {
		const frag = fragment`fragment F on T { id }`;
		const result = useFragment(frag, { id: '1' });
		expect(result).toEqual({ id: '1' });
	});

	it('returns null when data is null', () => {
		const frag = fragment`fragment F on T { id }`;
		expect(useFragment(frag, null)).toBeNull();
	});

	it('returns null when data is undefined', () => {
		const frag = fragment`fragment F on T { id }`;
		expect(useFragment(frag, undefined)).toBeNull();
	});

	it('unmasks fragment ref when data has space-prefixed key', () => {
		const frag = fragment`fragment F on T { id name }`;
		// Simulate a FragmentRef: { " F": { id: '1', name: 'test' } }
		const masked = { ' F': { id: '1', name: 'test' } };
		const result = useFragment(frag, masked);
		expect(result).toEqual({ id: '1', name: 'test' });
	});

	it('unmasks from the first space-prefixed key', () => {
		const frag = fragment`fragment F on T { x }`;
		const data = useFragment(frag, { ' F': { x: 1 }, ' G': { x: 2 } });
		expect(data).toEqual({ x: 1 });
	});
});
