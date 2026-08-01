import { type Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./features/home/home-page/home-page').then((m) => m.HomePage),
	},
	{
		path: 'docs',
		loadChildren: () => import('./features/docs/docs.routes').then((m) => m.docsRoutes),
	},
	{
		path: 'playground',
		loadComponent: () => import('./graphql/playground/playground').then((m) => m.GraphqlPlayground),
	},
];
