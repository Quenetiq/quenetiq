import { inject, type Provider, InjectionToken, type EnvironmentProviders } from '@angular/core';
import { type Route, type Routes, provideRouter, type CanActivateFn } from '@angular/router';
import { Observable, isObservable, of } from 'rxjs';

export type QuenetiqRouteGuard = () => boolean | Observable<boolean> | Promise<boolean>;

export const ROUTE_GUARD_MAP = new InjectionToken<Record<string, QuenetiqRouteGuard>>('ROUTE_GUARD_MAP');

function toObservable(value: boolean | Observable<boolean> | Promise<boolean>): Observable<boolean> {
	if (isObservable(value)) return value;
	if (value instanceof Promise)
		return new Observable<boolean>((sub) => {
			value
				.then((v) => {
					sub.next(v);
					sub.complete();
				})
				.catch(() => {
					sub.next(false);
					sub.complete();
				});
		});
	return of(value);
}

/** Create a CanActivateFn that resolves guards by key from the injected guard map. */
export function canActivateWithGuards(...guardKeys: string[]): CanActivateFn {
	return () => {
		const guardMap = inject(ROUTE_GUARD_MAP, { optional: true });
		if (!guardMap) return of(true);

		const guards = guardKeys.map((key) => guardMap[key]).filter(Boolean);
		if (guards.length === 0) return of(true);

		return new Observable<boolean>((sub) => {
			let idx = 0;
			const check = (): void => {
				if (idx >= guards.length) {
					sub.next(true);
					sub.complete();
					return;
				}
				const guard = guards[idx++];
				let result: boolean | Observable<boolean> | Promise<boolean>;
				try {
					result = guard();
				} catch {
					sub.next(false);
					sub.complete();
					return;
				}
				toObservable(result).subscribe({
					next: (ok) => (ok ? check() : (sub.next(false), sub.complete())),
					error: () => {
						sub.next(false);
						sub.complete();
					},
				});
			};
			check();
		});
	};
}

/** Wrap a route definition with guards resolved from the guard map by key. */
export function guardedRoute(keys: string | string[], route: Route): Route {
	const guardKeys = typeof keys === 'string' ? [keys] : keys;
	const canActivate = [canActivateWithGuards(...guardKeys), ...(route.canActivate ?? [])];
	return { ...route, canActivate };
}

export function provideQuenetiqRouter(
	routes: Routes,
	guards: Record<string, QuenetiqRouteGuard>,
): (Provider | EnvironmentProviders)[] {
	return [{ provide: ROUTE_GUARD_MAP, useValue: guards }, provideRouter(routes)];
}
