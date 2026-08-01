import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { SIDEBAR_GROUPS } from '../../../features/docs/sidebar.config';

@Component({
	selector: 'app-docs-breadcrumbs',
	standalone: true,
	imports: [RouterLink, TuiIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './docs-breadcrumbs.html',
	styleUrl: './docs-breadcrumbs.scss',
})
export class DocsBreadcrumbs {
	private readonly router = inject(Router);

	private readonly slug = toSignal(
		this.router.events.pipe(
			map(() => this.findSlug()),
		),
		{ initialValue: this.findSlug() },
	);

	private findSlug(): string {
		let route = this.router.routerState.root;
		while (route.firstChild) {
			route = route.firstChild;
		}
		return route.snapshot?.paramMap?.get('slug') ?? 'overview';
	}

	readonly crumbs = computed(() => {
		const slug = this.slug();
		const crumbs: { title: string; slug: string }[] = [{ title: 'Docs', slug: 'overview' }];

		for (const group of SIDEBAR_GROUPS) {
			const item = group.items.find((i) => i.slug === slug);
			if (item) {
				crumbs.push({ title: group.label, slug: group.items[0].slug });
				crumbs.push({ title: item.title, slug: item.slug });
				break;
			}
		}

		return crumbs;
	});
}
