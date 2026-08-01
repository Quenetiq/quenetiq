import {
	Component,
	ChangeDetectionStrategy,
	afterEveryRender,
	effect,
	inject,
	signal,
	HostListener,
} from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, NavigationStart } from '@angular/router';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDropdown, TuiDropdownDirective } from '@taiga-ui/core/portals/dropdown';
import { TuiDataList } from '@taiga-ui/core/components/data-list';
import { TuiChevron } from '@taiga-ui/kit/directives/chevron';
import { TuiActiveZone } from '@taiga-ui/cdk/directives/active-zone';
import { TuiObscured } from '@taiga-ui/cdk/directives/obscured';
import hljs from 'highlight.js';
import { Logo } from '../../shared/ui/logo/logo';
import { DocsToc } from '../../shared/ui/docs-toc/docs-toc';
import { DocsSidebar } from '../../shared/ui/docs-sidebar/docs-sidebar';
import { DocsBreadcrumbs } from '../../shared/ui/docs-breadcrumbs/docs-breadcrumbs';
import { SearchTrigger } from '../../shared/ui/search-dialog/search-trigger';
import { VersionService } from '../../shared/services/version.service';
import { SidebarService } from '../../shared/services/sidebar.service';
import { TocService } from '../../shared/services/toc.service';

@Component({
	selector: 'app-docs-page',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [TuiDropdownDirective],
	imports: [
		RouterOutlet,
		TuiButton,
		TuiIcon,
		Logo,
		DocsToc,
		DocsSidebar,
		DocsBreadcrumbs,
		SearchTrigger,
		TuiDropdown,
		TuiDataList,
		TuiChevron,
		TuiActiveZone,
		TuiObscured,
	],
	templateUrl: './docs-page.html',
	styleUrl: './docs-page.scss',
})
export class DocsPage {
	protected readonly versionService = inject(VersionService);
	private readonly router = inject(Router);

	protected readonly contentLoading = signal(true);
	protected readonly open = signal(false);

	constructor() {
		this.router.events.subscribe((event) => {
			if (event instanceof NavigationStart) {
				this.contentLoading.set(true);
			} else if (event instanceof NavigationEnd) {
				this.contentLoading.set(false);
			}
		});

		afterEveryRender(() => {
			const blocks = document.querySelectorAll('.docs-body pre code:not(.hljs)');
			if (blocks.length) {
				blocks.forEach((b) => hljs.highlightElement(b as HTMLElement));
			}
		});

		effect(() => {
			this.versionService.currentVersion();
			const child = this.router.routerState.root.firstChild?.firstChild?.firstChild;
			const slug = child?.snapshot.paramMap.get('slug');
			void slug;
			const since = child?.snapshot.data['since'] as string | undefined;
			if (since && !this.versionService.isVersionAtLeast(since)) {
				this.router.navigateByUrl('/docs/overview');
			}
		});
	}

	protected readonly sidebar = inject(SidebarService);
	protected readonly tocService = inject(TocService);

	protected closeSidebar(): void {
		this.sidebar.close();
	}

	protected closeToc(): void {
		this.tocService.close();
	}

	@HostListener('document:keydown.escape')
	protected onEscape(): void {
		this.sidebar.close();
		this.tocService.close();
	}
}
