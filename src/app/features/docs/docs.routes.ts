import { Routes } from '@angular/router';
import { docsChildGuard } from './docs.guard';

export const docsRoutes: Routes = [
	{
		path: '',
		loadComponent: () => import('./docs-page').then((m) => m.DocsPage),
		canActivateChild: [docsChildGuard],
		children: [
			{ path: '', redirectTo: 'overview', pathMatch: 'full' },

			// New markdown-driven route (catch-all for migrated pages)
			{
				path: ':slug',
				loadComponent: () => import('./docs-content/docs-content').then((m) => m.DocsContent),
			},
		],
	},
];
