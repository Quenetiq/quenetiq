import { Component, input, signal, effect, ChangeDetectionStrategy, DestroyRef, inject, afterNextRender, afterEveryRender } from '@angular/core';

export interface TocSection {
	id: string;
	title: string;
	children?: TocSection[];
}

@Component({
	selector: 'app-docs-toc',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './docs-toc.html',
	styleUrl: './docs-toc.scss',
})
export class DocsToc {
	readonly sections = input.required<TocSection[]>();

	protected activeId = signal('');

	private readonly destroyRef = inject(DestroyRef);
	private rafId = 0;
	private scrollCleanup: (() => void) | null = null;
	private initialized = false;

	constructor() {
		this.destroyRef.onDestroy(() => {
			this.detachScrollListener();
			cancelAnimationFrame(this.rafId);
		});

		effect(() => {
			void this.sections();
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					this.updateActiveSection();
				});
			});
		});

		afterNextRender(() => {
			this.attachScrollListener();
			this.updateActiveSection();
		});

		afterEveryRender(() => {
			if (!this.initialized && this.flattenSections().length) {
				this.initialized = true;
				requestAnimationFrame(() => this.updateActiveSection());
			}
		});
	}

	protected scrollTo(id: string): void {
		const el = document.getElementById(id);
		if (!el) return;

		history.pushState(null, '', `#${id}`);
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	private attachScrollListener(): void {
		this.detachScrollListener();
		const el = this.findScrollContainer();
		const onScroll = () => {
			cancelAnimationFrame(this.rafId);
			this.rafId = requestAnimationFrame(() => this.updateActiveSection());
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		this.scrollCleanup = () => el.removeEventListener('scroll', onScroll);
	}

	private detachScrollListener(): void {
		this.scrollCleanup?.();
		this.scrollCleanup = null;
	}

	private findScrollContainer(): Element {
		return document.querySelector('.docs-main > .docs-content') ?? document.documentElement;
	}

	private getActiveThreshold(): number {
		const container = this.findScrollContainer();
		const containerRect = container.getBoundingClientRect();
		const scrollPaddingTop = parseFloat(getComputedStyle(container).scrollPaddingTop) || 0;
		return containerRect.top + scrollPaddingTop;
	}

	private updateActiveSection(): void {
		const ids = this.flattenSections();
		if (!ids.length) return;

		const threshold = this.getActiveThreshold();
		let active = ids[0] ?? '';

		for (const id of ids) {
			const el = document.getElementById(id);
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			if (rect.top <= threshold) {
				active = id;
			} else {
				break;
			}
		}

		this.activeId.set(active);
	}

	private flattenSections(): string[] {
		const result: string[] = [];
		const walk = (list: TocSection[]) => {
			for (const s of list) {
				result.push(s.id);
				if (s.children) walk(s.children);
			}
		};
		walk(this.sections());
		return result;
	}
}
