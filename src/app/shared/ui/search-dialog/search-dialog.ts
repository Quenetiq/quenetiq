import { Component, inject, signal, ChangeDetectionStrategy, ElementRef, viewChild, effect } from '@angular/core';
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
	private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

	constructor() {
		effect(() => {
			if (this.open()) {
				this.closing.set(false);
				this.visible.set(true);
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
		void this.searchService.search('');
	}

	onSearch(value: string): void {
		this.searchInput.set(value);
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
}
