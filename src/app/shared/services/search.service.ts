import { Injectable, signal } from '@angular/core';
import { SIDEBAR_GROUPS } from '../../features/docs/sidebar.config';

export interface SearchEntry {
	id: string;
	title: string;
	slug: string;
	group: string;
	body: string;
	tags: string[];
}

export interface SearchResult extends SearchEntry {
	snippet: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
	private readonly entries: SearchEntry[] = [];
	readonly results = signal<SearchResult[]>([]);
	readonly loading = signal(false);
	readonly query = signal('');
	private indexed = false;

	async buildIndex(): Promise<void> {
		if (this.indexed) return;
		this.loading.set(true);

		try {
			const allItems = SIDEBAR_GROUPS.flatMap((g) => g.items).flatMap((item) =>
				item.children ? [item, ...item.children] : [item],
			);

			for (const item of allItems) {
				try {
					const res = await fetch(`/docs/${item.slug}.md`);
					if (!res.ok) continue;
					const raw = await res.text();
					const { body } = this.parseFrontmatter(raw);

					this.entries.push({
						id: item.slug,
						title: item.title,
						slug: item.slug,
						group: item.group,
						body: this.stripMarkdown(body),
						tags: item.tags,
					});
				} catch {
					// skip individual file errors
				}
			}

			this.indexed = true;
		} finally {
			this.loading.set(false);
		}
	}

	async search(q: string): Promise<void> {
		this.query.set(q);

		if (!q.trim()) {
			this.results.set([]);
			return;
		}

		if (!this.indexed) {
			await this.buildIndex();
		}

		const lower = q.toLowerCase();
		const scored = this.entries
			.map((entry) => {
				let score = 0;

				// Title match (highest weight)
				if (entry.title.toLowerCase().includes(lower)) score += 100;

				// Tag match
				if (entry.tags.some((t) => t.toLowerCase().includes(lower))) score += 50;

				// Group match
				if (entry.group.toLowerCase().includes(lower)) score += 30;

				// Body match
				const bodyIdx = entry.body.toLowerCase().indexOf(lower);
				if (bodyIdx >= 0) score += 10;

				return { entry, score, bodyIdx };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 20);

		this.results.set(
			scored.map(({ entry, bodyIdx }) => ({
				...entry,
				snippet: this.getSnippet(entry.body, bodyIdx, lower.length),
			})),
		);
	}

	private getSnippet(body: string, idx: number, matchLen: number): string {
		if (idx < 0) return body.slice(0, 150);

		const start = Math.max(0, idx - 40);
		const end = Math.min(body.length, idx + matchLen + 80);
		let snippet = body.slice(start, end);

		if (start > 0) snippet = `...${  snippet}`;
		if (end < body.length) snippet = `${snippet  }...`;

		return snippet;
	}

	private parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return { frontmatter: {}, body: raw };

		const fm: Record<string, string> = {};
		match[1].split('\n').forEach((line) => {
			const idx = line.indexOf(':');
			if (idx > 0) {
				fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			}
		});

		return { frontmatter: fm, body: match[2] };
	}

	private stripMarkdown(md: string): string {
		return md
			.replace(/```[\s\S]*?```/g, '')
			.replace(/`[^`]+`/g, '')
			.replace(/[#*_~>\[\]()!]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}
}
