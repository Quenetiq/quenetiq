import {
	Component,
	OnInit,
	inject,
	signal,
	ChangeDetectionStrategy,
	DestroyRef,
	ElementRef,
	afterNextRender,
	ViewContainerRef,
	EnvironmentInjector,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiLoader, TuiLink, TuiIcon, TuiNotificationService } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { VersionService } from '../../../shared/services/version.service';
import { TocService } from '../../../shared/services/toc.service';
import { SIDEBAR_GROUPS } from '../sidebar.config';
import { PlaygroundComponent } from '../playground/playground';
import { StackblitzStarterComponent } from '../../../shared/ui/docs-stackblitz-starter/docs-stackblitz-starter';
import type { DocMeta } from '../docs-metadata.model';
import { parseMarkdown, renderInline, type MdBlock, type MdHeading, type MdInline } from './markdown-parser';

@Component({
	selector: 'app-docs-content',
	standalone: true,
	imports: [TuiLoader, TuiBadge, TuiLink, TuiIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './docs-content.html',
	styleUrl: './docs-content.scss',
})
export class DocsContent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly versionService = inject(VersionService);
	private readonly tocService = inject(TocService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly el = inject(ElementRef);
	private readonly vcr = inject(ViewContainerRef);
	private readonly injector = inject(EnvironmentInjector);
	private readonly sanitizer = inject(DomSanitizer);
	private readonly notifications = inject(TuiNotificationService);

	readonly loading = signal(true);
	readonly contentHtml = signal<SafeHtml | string>('');
	readonly meta = signal<DocMeta | null>(null);
	readonly error = signal<string | null>(null);

	constructor() {
		afterNextRender(() => {
			this.el.nativeElement.addEventListener('click', (e: Event) => {
				const anchor = (e.target as HTMLElement).closest('[data-anchor]');
				if (anchor) {
					e.preventDefault();
					const id = anchor.getAttribute('data-anchor')!;
					this.copyAnchor(id);
					return;
				}
				const link = (e.target as HTMLElement).closest('a');
				if (link) {
					const href = link.getAttribute('href');
					if (href && href.startsWith('/')) {
						e.preventDefault();
						this.router.navigateByUrl(href);
					}
				}
			});
		});
	}

	ngOnInit(): void {
		this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (params) => {
			const slug = params.get('slug') ?? 'overview';
			await this.loadDoc(slug);
		});
	}

	copyAnchor(id: string): void {
		const url = `${location.pathname}#${id}`;
		navigator.clipboard.writeText(`${location.origin}${url}`);
		history.replaceState(null, '', `#${id}`);
		this.notifications.open('Link copied', { appearance: 'positive', autoClose: 2000 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
	}

	private async loadDoc(slug: string): Promise<void> {
		this.loading.set(true);
		this.error.set(null);

		try {
			const allItems = SIDEBAR_GROUPS.flatMap((g) => g.items);
			const docMeta = allItems.find((item) => item.slug === slug);

			if (docMeta && !this.versionService.isVersionAtLeast(docMeta.since)) {
				this.error.set('This page is not available in the selected version.');
				this.loading.set(false);
				return;
			}

			this.meta.set(docMeta ?? null);

			const res = await fetch(`/docs/${slug}.md`);
			if (!res.ok) {
				this.error.set(`Page "${slug}" not found.`);
				this.loading.set(false);
				return;
			}
			const raw = await res.text();
			const { frontmatter, body } = this.parseFrontmatter(raw);

			if (frontmatter['title']) {
				this.meta.set({
					title: frontmatter['title'] || docMeta?.title || slug,
					slug,
					group: frontmatter['group'] || docMeta?.group || '',
					order: Number(frontmatter['order']) || docMeta?.order || 0,
					since: frontmatter['since'] || docMeta?.since || '0.0.1',
					tags: frontmatter['tags'] ? String(frontmatter['tags']).split(',').map((t: string) => t.trim()) : docMeta?.tags || [],
					description: frontmatter['description'] || docMeta?.description || '',
					github: frontmatter['github'] || docMeta?.github,
					package: frontmatter['package'] || docMeta?.package,
				});
			}

			const parsed = parseMarkdown(body);
			const html = this.renderBlocks(parsed);
			this.contentHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
			this.tocService.sections.set(this.buildToc(parsed));
			setTimeout(() => {
				this.mountPlaygrounds();
				this.mountStackblitzStarters();
			});
		} catch (err) {
			this.error.set(err instanceof Error ? err.message : 'Failed to load page');
		} finally {
			this.loading.set(false);
		}
	}

	private renderBlocks(blocks: MdBlock[]): string {
		let html = '';
		for (const block of blocks) {
			switch (block.type) {
			case 'heading':
				if (block.level === 1) continue;
				html += `<h${block.level} id="${block.id}" class="md-heading md-h${block.level}">`;
				html += `<span class="md-heading-text">${renderInline(block.children)}</span>`;
				html += `<button class="md-anchor" data-anchor="${block.id}" aria-label="Copy link">#</button>`;
				html += `</h${block.level}>`;
				break;
			case 'paragraph':
				html += `<p class="md-p">${renderInline(block.children)}</p>`;
				break;
			case 'code':
				html += '<div class="md-code-block">';
				if (block.language) {
					html += `<div class="md-code-lang">${escapeHtml(block.language)}</div>`;
				}
				html += `<pre class="md-pre"><code class="md-code">${escapeHtml(block.code)}</code></pre>`;
				html += '</div>';
				break;
			case 'list':
				html += block.ordered ? '<ol class="md-ol">' : '<ul class="md-ul">';
				for (const item of block.items) {
					html += `<li>${renderInline(item.children)}</li>`;
				}
				html += block.ordered ? '</ol>' : '</ul>';
				break;
			case 'table':
				html += '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
				for (const h of block.headers) {
					html += `<th>${renderInline(h)}</th>`;
				}
				html += '</tr></thead><tbody>';
				for (const row of block.rows) {
					html += '<tr>';
					for (const cell of row) {
						html += `<td>${renderInline(cell)}</td>`;
					}
					html += '</tr>';
				}
				html += '</tbody></table></div>';
				break;
			case 'blockquote':
				html += '<blockquote class="md-blockquote">';
				for (const child of block.children) {
					if (child.type === 'paragraph') {
						html += `<p>${renderInline(child.children)}</p>`;
					}
				}
				html += '</blockquote>';
				break;
			case 'hr':
				html += '<hr class="md-hr" />';
				break;
			case 'playground': {
				const escaped = escapeHtml(block.code);
				html += `<div class="playground-slot" data-code="${escaped}"></div>`;
				break;
			}
			case 'stackblitz': {
				html += `<div class="stackblitz-slot" data-starter="${escapeHtml(block.starter)}"></div>`;
				break;
			}
			}
		}
		return html;
	}

	private parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return { frontmatter: {}, body: raw };

		const fm: Record<string, string> = {};
		match[1].split('\n').forEach((line) => {
			const idx = line.indexOf(':');
			if (idx > 0) {
				const key = line.slice(0, idx).trim();
				let value = line.slice(idx + 1).trim();
				if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
					value = value.slice(1, -1);
				}
				fm[key] = value;
			}
		});

		return { frontmatter: fm, body: match[2] };
	}

	private buildToc(blocks: MdBlock[]): { id: string; title: string; children?: { id: string; title: string }[] }[] {
		const headings = blocks.filter((b): b is MdHeading => b.type === 'heading' && b.level >= 2);
		const result: { id: string; title: string; children?: { id: string; title: string }[] }[] = [];

		for (const h of headings) {
			if (h.level === 2) {
				result.push({
					id: h.id,
					title: this.headingTitle(h),
					children: [],
				});
			} else if (h.level === 3 && result.length > 0) {
				result[result.length - 1].children!.push({
					id: h.id,
					title: this.headingTitle(h),
				});
			}
		}

		return result;
	}

	private headingTitle(h: MdHeading): string {
		return this.extractText(h.children);
	}

	private extractText(items: MdInline[]): string {
		let text = '';
		for (const item of items) {
			switch (item.type) {
			case 'text':
				text += item.value;
				break;
			case 'bold':
			case 'italic':
			case 'link':
				text += this.extractText(item.children);
				break;
			case 'code':
				text += item.value;
				break;
			case 'image':
				text += item.alt;
				break;
			}
		}
		return text;
	}

	private mountPlaygrounds(): void {
		const slots = this.el.nativeElement.querySelectorAll('.playground-slot');
		for (const slot of slots) {
			const code = slot.getAttribute('data-code') ?? '';
			const ref = this.vcr.createComponent(PlaygroundComponent, { environmentInjector: this.injector });
			ref.setInput('code', code);
			slot.replaceWith(ref.location.nativeElement);
		}
	}

	private mountStackblitzStarters(): void {
		const slots = this.el.nativeElement.querySelectorAll('.stackblitz-slot');
		for (const slot of slots) {
			const starter = slot.getAttribute('data-starter') ?? '';
			const ref = this.vcr.createComponent(StackblitzStarterComponent, { environmentInjector: this.injector });
			ref.setInput('starter', starter);
			slot.replaceWith(ref.location.nativeElement);
		}
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
