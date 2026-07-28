import { inject } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { GraphqlSubscriptionService } from './graphql-subscription.service';
import type { DocumentNode } from '@quenetiq/core';

export function subscribe<T>(document: DocumentNode, variables?: Record<string, unknown>): Observable<T> {
	return defer(() => {
		const svc = inject(GraphqlSubscriptionService);
		return svc.subscribe<T>(document, variables);
	});
}
