import { describe, it, expect } from 'vitest';
import { analyzeEnvironment, resolvePublicFrontendHost } from '../env-analyzer';

describe('analyzeEnvironment', () => {
	it('returns local by default', () => {
		const info = analyzeEnvironment();
		expect(info.runtime).toBe('local');
		expect(info.needsUrlRewrite).toBe(false);
	});

	it('detects stackblitz', () => {
		process.env.STACKBLITZ = '1';
		const info = analyzeEnvironment();
		expect(info.runtime).toBe('stackblitz');
		expect(info.needsUrlRewrite).toBe(true);
		delete process.env.STACKBLITZ;
	});

	it('detects codespaces', () => {
		process.env.CODESPACES = '1';
		const info = analyzeEnvironment();
		expect(info.runtime).toBe('codespaces');
		expect(info.needsUrlRewrite).toBe(true);
		delete process.env.CODESPACES;
	});

	it('allows override for needsUrlRewrite', () => {
		const info = analyzeEnvironment(true);
		expect(info.needsUrlRewrite).toBe(true);
	});

	it('override false disables auto-rewrite even in stackblitz', () => {
		process.env.STACKBLITZ = '1';
		const info = analyzeEnvironment(false);
		expect(info.needsUrlRewrite).toBe(false);
		delete process.env.STACKBLITZ;
	});
});

describe('resolvePublicFrontendHost', () => {
	it('rewrites stackblitz-style hosts', () => {
		const result = resolvePublicFrontendHost('abc-123-4000.ssb.stackblitz.io', 4200, 4000);
		expect(result).toBe('abc-123-4200.ssb.stackblitz.io');
	});

	it('returns null for non-matching hosts', () => {
		expect(resolvePublicFrontendHost('localhost')).toBeNull();
		expect(resolvePublicFrontendHost('example.com')).toBeNull();
	});

	it('returns null when port does not match devServerPort', () => {
		expect(resolvePublicFrontendHost('abc-123-8080.ssb.stackblitz.io', 4200, 4000)).toBeNull();
	});

	it('uses default ports', () => {
		const result = resolvePublicFrontendHost('abc-123-4000.ssb.stackblitz.io');
		expect(result).toBe('abc-123-4200.ssb.stackblitz.io');
	});
});
