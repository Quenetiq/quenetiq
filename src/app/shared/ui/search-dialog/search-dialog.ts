import { Component, inject, signal, ChangeDetectionStrategy, type ElementRef, viewChild, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TuiIcon } from '@taiga-ui/core';
import { SearchService, type SearchResult } from '../../../shared/services/search.service';
import { SearchState } from '../../../shared/services/search-state.service';

@Component({
	selector: 'app-search-dialog',
	standalone: true,
	imports: [FormsModule, TuiIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './search-dialog.html',
	styleUrl: './search-dialog.scss',
})
export class SearchDialog {
	readonly searchService = inject(SearchService);
	private readonly router = inject(Router);
	readonly searchState = inject(SearchState);
	readonly open = this.searchState.open;
	readonly searchInput = signal('');
	readonly visible = signal(false);
	readonly closing = signal(false);
	readonly highlightedIndex = signal(-1);
	private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
	private readonly resultsContainer = viewChild<ElementRef<HTMLDivElement>>('resultsContainer');

	constructor() {
		effect(() => {
			if (this.open()) {
				this.closing.set(false);
				this.visible.set(true);
				this.highlightedIndex.set(-1);
				const el = this.inputEl()?.nativeElement;
				if (el) {
					queueMicrotask(() => el.focus());
				}
			} else if (this.visible()) {
				this.closing.set(true);
				setTimeout(() => {
					this.visible.set(false);
					this.closing.set(false);
				}, 120);
			}
		});
	}

	close(): void {
		this.searchState.close();
		this.searchInput.set('');
		this.highlightedIndex.set(-1);
		void this.searchService.search('');
	}

	onSearch(value: string): void {
		this.searchInput.set(value);
		this.highlightedIndex.set(-1);
		void this.searchService.search(value);
	}

	goTo(result: SearchResult): void {
		this.router.navigate(['/docs', result.slug]);
		this.close();
	}

	onBackdropClick(e: Event): void {
		if ((e.target as HTMLElement).classList.contains('search-overlay')) {
			this.close();
		}
	}

	onKeydown(e: KeyboardEvent): void {
		const results = this.searchService.results();
		if (!results.length) return;

		switch (e.key) {
		case 'ArrowDown': {
			e.preventDefault();
			const next = this.highlightedIndex() < results.length - 1
				? this.highlightedIndex() + 1
				: 0;
			this.highlightedIndex.set(next);
			this.scrollIntoView(next);
			break;
		}
		case 'ArrowUp': {
			e.preventDefault();
			const prev = this.highlightedIndex() > 0
				? this.highlightedIndex() - 1
				: results.length - 1;
			this.highlightedIndex.set(prev);
			this.scrollIntoView(prev);
			break;
		}
		case 'Enter': {
			const idx = this.highlightedIndex();
			if (idx >= 0 && idx < results.length) {
				e.preventDefault();
				this.goTo(results[idx]);
			}
			break;
		}
		}
	}

	private scrollIntoView(index: number): void {
		const container = this.resultsContainer()?.nativeElement;
		if (!container) return;
		const items = container.querySelectorAll<HTMLButtonElement>('.search-result');
		const el = items[index];
		if (el) {
			el.scrollIntoView({ block: 'nearest' });
		}
	}
}
