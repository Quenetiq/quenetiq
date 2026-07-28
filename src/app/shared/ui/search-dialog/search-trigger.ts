import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { SearchState } from '../../services/search-state.service';
import { SearchService } from '../../services/search.service';

@Component({
	selector: 'app-search-trigger',
	standalone: true,
	imports: [TuiIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './search-trigger.html',
	styleUrl: './search-trigger.scss',
})
export class SearchTrigger {
	private readonly searchState = inject(SearchState);
	private readonly searchService = inject(SearchService);

	openSearch(): void {
		this.searchState.openDialog();
		this.searchService.buildIndex();
	}
}
