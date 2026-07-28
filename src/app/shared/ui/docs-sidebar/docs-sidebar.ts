import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiIcon, TuiButton } from '@taiga-ui/core';
import { TuiChevron } from '@taiga-ui/kit';
import { VersionService } from '../../../shared/services/version.service';
import { SidebarService } from '../../../shared/services/sidebar.service';
import { SIDEBAR_GROUPS } from '../../../features/docs/sidebar.config';

@Component({
	selector: 'app-docs-sidebar',
	standalone: true,
	imports: [RouterLink, RouterLinkActive, TuiIcon, TuiButton, TuiChevron],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './docs-sidebar.html',
	styleUrl: './docs-sidebar.scss',
})
export class DocsSidebar {
	private readonly versionService = inject(VersionService);
	readonly sidebar = inject(SidebarService);

	readonly groups = computed(() =>
		SIDEBAR_GROUPS.filter((group) =>
			group.items.some((item) => this.versionService.isVersionAtLeast(item.since)),
		)
			.map((group) => ({
				...group,
				items: group.items
					.filter((item) => this.versionService.isVersionAtLeast(item.since))
					.map((item) => ({
						...item,
						children: item.children?.filter((child) => this.versionService.isVersionAtLeast(child.since)),
					})),
			}))
			.sort((a, b) => a.order - b.order),
	);

	readonly collapsedGroups = signal<Set<string>>(new Set());

	toggleGroup(label: string): void {
		this.collapsedGroups.update((set) => {
			const next = new Set(set);
			if (next.has(label)) {
				next.delete(label);
			} else {
				next.add(label);
			}
			return next;
		});
	}

	isGroupCollapsed(label: string): boolean {
		return this.collapsedGroups().has(label);
	}
}
