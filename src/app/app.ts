import { Component, inject, signal, HostListener } from '@angular/core';
import {
	Router,
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
	NavigationEnd,
	RouteConfigLoadStart,
	RouteConfigLoadEnd,
} from '@angular/router';
import { filter } from 'rxjs';
import { TuiButton, TuiRoot, TUI_DARK_MODE, TuiLink } from '@taiga-ui/core';
import { TuiDropdown } from '@taiga-ui/core/portals/dropdown';
import { TuiDataList } from '@taiga-ui/core/components/data-list';
import { TuiChevron } from '@taiga-ui/kit/directives/chevron';
import { TuiActiveZone } from '@taiga-ui/cdk/directives/active-zone';
import { TuiObscured } from '@taiga-ui/cdk/directives/obscured';
import { Logo } from './shared/ui/logo/logo';
import { VersionService } from './shared/services/version.service';
import { SidebarService } from './shared/services/sidebar.service';
import { TocService } from './shared/services/toc.service';
import { NullOverlay } from '@quenetiq/core';
import { SearchDialog } from './shared/ui/search-dialog/search-dialog';
import { SearchState } from './shared/services/search-state.service';
import { SearchService } from './shared/services/search.service';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		TuiLink,
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		TuiButton,
		TuiRoot,
		Logo,
		TuiDropdown,
		TuiDataList,
		TuiChevron,
		TuiActiveZone,
		TuiObscured,
		NullOverlay,
		SearchDialog,
	],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class App {
	private readonly darkMode = inject(TUI_DARK_MODE);
	private readonly router = inject(Router);
	private readonly searchState = inject(SearchState);
	private readonly searchService = inject(SearchService);
	protected readonly versionService = inject(VersionService);
	protected readonly sidebar = inject(SidebarService);
	protected readonly tocService = inject(TocService);

	protected readonly isDarkMode = this.darkMode;
	protected readonly showDocsMenu = signal(false);
	protected readonly loading = signal(true);
	protected readonly open = signal(false);
	protected readonly mobileMenuOpen = signal(false);
	protected readonly mobileVersionOpen = signal(false);

	constructor() {
		this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
			this.loading.set(false);
			this.showDocsMenu.set(e.url.startsWith('/docs'));
		});
	}

	@HostListener('document:keydown', ['$event'])
	protected onKeydown(e: KeyboardEvent): void {
		if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'f')) {
			if (!this.showDocsMenu()) return;
			e.preventDefault();
			if (this.searchState.open()) {
				this.searchState.close();
			} else {
				this.searchState.openDialog();
				this.searchService.buildIndex();
			}
		}
		if (e.key === 'Escape' && this.searchState.open()) {
			this.searchState.close();
		}
	}

	protected toggleTheme(): void {
		const next = !this.darkMode();
		this.darkMode.set(next);
		const themeValue = next ? 'dark' : 'light';
		localStorage.setItem('themePreference', themeValue);
		document.documentElement.className = next ? 'docs-dark-mode' : 'docs-light-mode';
		document.documentElement.setAttribute('tuiTheme', themeValue);
	}
}
