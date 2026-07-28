import { Injectable, signal } from '@angular/core';

function compareVersions(a: string, b: string): number {
	const parse = (v: string) => {
		const [main, pre] = v.split('-', 2);
		const parts = main.split('.').map(Number);
		return { parts, pre };
	};

	const va = parse(a);
	const vb = parse(b);

	for (let i = 0; i < 3; i++) {
		if (va.parts[i] !== vb.parts[i]) return va.parts[i] - vb.parts[i];
	}

	if (va.pre && !vb.pre) return -1;
	if (!va.pre && vb.pre) return 1;
	if (!va.pre && !vb.pre) return 0;

	const typeOrder: Record<string, number> = { alpha: 0, beta: 1, rc: 2, build: 3 };
	const pa = va.pre!.split('.');
	const pb = vb.pre!.split('.');
	const ta = typeOrder[pa[0]] ?? 99;
	const tb = typeOrder[pb[0]] ?? 99;
	if (ta !== tb) return ta - tb;
	return Number(pa[1] ?? 0) - Number(pb[1] ?? 0);
}

@Injectable({ providedIn: 'root' })
export class VersionService {
	readonly allVersions: readonly string[] = [
		'1.0.6-beta',
		'1.0.5',
		'1.0.5-beta.4',
		'1.0.5-beta.3',
		'1.0.4',
		'1.0.3',
		'1.0.2',
		'1.0.1',
		'1.0.0',
		'0.0.12',
		'0.0.11',
		'0.0.10',
		'0.0.9',
		'0.0.8',
		'0.0.7',
		'0.0.6',
		'0.0.5',
		'0.0.4',
		'0.0.3',
		'0.0.2-rc.3',
		'0.0.2-alpha.1',
		'0.0.1',
	];

	// Each package's first public release version (git tag).
	// v0.0.1: initial scaffold (core, cache, react, vue, client, and 9 others)
	// v0.0.3: errors, apollo-adapter, dev-server
	// v1.0.5: epic-fetus, Val (createVal, useVal, VueVal, ReactVal, AngularVal), extension 1.0.1-beta.0, opentelemetry
	private readonly packageSinceMap: Record<string, string> = {
		'@quenetiq/core': '0.0.1',
		'@quenetiq/client': '0.0.1',
		'@quenetiq/react': '0.0.1',
		'@quenetiq/vue': '0.0.1',
		'@quenetiq/cache': '0.0.1',
		'@quenetiq/subscriptions': '0.0.1',
		'@quenetiq/file-upload': '0.0.1',
		'@quenetiq/middlewares': '0.0.1',
		'@quenetiq/pagination': '0.0.1',
		'@quenetiq/persisted-queries': '0.0.1',
		'@quenetiq/fragments': '0.0.1',
		'@quenetiq/ssr': '0.0.1',
		'@quenetiq/debugging': '0.0.1',
		'@quenetiq/downloader': '0.0.1',
		'@quenetiq/testing': '0.0.1',
		'@quenetiq/codegen': '0.0.1',
		'@quenetiq/errors': '0.0.3',
		'@quenetiq/apollo-adapter': '0.0.3',
		'@quenetiq/dev-server': '0.0.3',
		'@quenetiq/opentelemetry': '1.0.5',
		'@quenetiq/observables': '1.0.6-beta',
	};
	private readonly storageKey = 'quenetiq-docs-version';

	readonly currentVersion = signal(this.load());

	setVersion(v: string): void {
		if (this.allVersions.includes(v)) {
			this.currentVersion.set(v);
			localStorage.setItem(this.storageKey, v);
		}
	}

	getPackageSince(packageName: string): string {
		return this.packageSinceMap[packageName] ?? '—';
	}

	isVersionAtLeast(since: string): boolean {
		return compareVersions(this.currentVersion(), since) >= 0;
	}

	private load(): string {
		const saved = localStorage.getItem(this.storageKey);
		if (saved && this.allVersions.includes(saved)) return saved;
		return this.allVersions[0];
	}
}
