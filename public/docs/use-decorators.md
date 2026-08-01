---
title: 'Use Decorators'
slug: use-decorators
group: 'Core'
order: 13
since: '1.0.6-beta'
tags: [core, decorators, query, mutation, subscription, component, service]
description: 'Class decorators: @UseQuery, @UseMutation, @UseSubscription'
---

# Use Decorators

Class decorators that attach reactive GraphQL handles directly to components, services, and directives. Each decorator takes an options object and adds a typed property to the decorated class.

## @UseQuery

Attaches an `InjectQueryHandle` as the `query` property. The handle exposes signals for `data`, `error`, `loading`, `status`, plus `refetch()`.

```typescript
import { UseQuery, gql } from '@quenetiq/core';

const GET_TODOS = gql`
	query Todos {
		todos {
			id
			title
			completed
		}
	}
`;

@UseQuery({ document: GET_TODOS, pollInterval: 15_000 })
@Component({ selector: 'app-todos', template: '...' })
export class TodosComponent {
	// this.query — InjectQueryHandle<Todos>
	readonly todos = this.query.data;
	readonly isLoading = this.query.loading;
}
```

### Options

| Option            | Type                      | Default   | Description                                                                   |
| ----------------- | ------------------------- | --------- | ----------------------------------------------------------------------------- |
| `document`        | `DocumentNode`            | —         | GraphQL query document (required)                                             |
| `variables`       | `Record<string, unknown>` | `{}`      | Query variables                                                               |
| `endpoint`        | `string`                  | —         | Named endpoint for multi-endpoint mode                                        |
| `property`        | `string`                  | `'query'` | Property name the handle is attached to                                       |
| `pollInterval`    | `number`                  | `0`       | Auto-refetch interval in ms (`0` = off)                                       |
| `skip`            | `boolean`                 | `false`   | Skip the initial fetch                                                        |
| `errorPolicy`     | `ErrorPolicy`             | `'none'`  | GraphQL error policy                                                          |
| `streamOn`        | `boolean \| undefined`    | config    | Auto-start streaming (`@defer`/`@stream`); falls back to `streaming.streamOn` |
| `placeholderData` | `unknown`                 | —         | Data shown before the first successful fetch                                  |

## @UseMutation

Attaches an `InjectMutationHandle` as the `mutation` property. Call `this.mutation.mutate(variables)` to execute.

```typescript
import { UseMutation, gql } from '@quenetiq/core';

const CREATE_TODO = gql`
	mutation Create($title: String!) {
		createTodo(title: $title) {
			id
		}
	}
`;

@UseMutation({ document: CREATE_TODO })
@Component({ selector: 'app-create-todo', template: '...' })
export class CreateTodoComponent {
	submit(title: string) {
		this.mutation.mutate({ title }).subscribe((result) => {
			if (result.status === 'success') console.log('created', result.data);
		});
	}
}
```

### Options

| Option           | Type                      | Default      | Description                             |
| ---------------- | ------------------------- | ------------ | --------------------------------------- |
| `document`       | `DocumentNode`            | —            | GraphQL mutation document (required)    |
| `variables`      | `Record<string, unknown>` | `{}`         | Default mutation variables              |
| `endpoint`       | `string`                  | —            | Named endpoint for multi-endpoint mode  |
| `property`       | `string`                  | `'mutation'` | Property name the handle is attached to |
| `optimistic`     | `(cache) => string`       | —            | Optimistic cache update                 |
| `refetchQueries` | `RefetchQueryDef[]`       | —            | Queries to refetch on success           |

## @UseSubscription

Attaches a subscription stream as the `subscription` property. The handle exposes `data$` (Observable), `start()`, and `stop()`.

```typescript
import { UseSubscription, gql } from '@quenetiq/core';

const ON_TODO_ADDED = gql`
	subscription OnAdded {
		todoAdded {
			id
			title
		}
	}
`;

@UseSubscription({ document: ON_TODO_ADDED, endpoint: 'main' })
@Component({ selector: 'app-live-todos', template: '...' })
export class LiveTodosComponent {
	readonly newTodos$ = this.subscription.data$;
}
```

The WebSocket URL is resolved in this order:

1. `endpoint` name (multi-endpoint mode) via `resolveSubscriptionUrl`
2. `subscriptions.wsEndpoint` from the Quenetiq config
3. The GraphQL endpoint with `http://` → `ws://` conversion

### Options

| Option      | Type                      | Default          | Description                              |
| ----------- | ------------------------- | ---------------- | ---------------------------------------- |
| `document`  | `DocumentNode`            | —                | GraphQL subscription document (required) |
| `variables` | `Record<string, unknown>` | `{}`             | Subscription variables                   |
| `endpoint`  | `string`                  | —                | Named endpoint for multi-endpoint mode   |
| `property`  | `string`                  | `'subscription'` | Property name the handle is attached to  |

## Usage on Services and Directives

The decorators work on any injectable class, not just components:

```typescript
@UseQuery({ document: GET_CURRENT_USER })
@Injectable({ providedIn: 'root' })
export class SessionService {
	readonly user = this.query.data;
	readonly reload = this.query.refetch;
}
```

```typescript
@UseMutation({ document: DELETE_ITEM })
@Directive({ selector: '[appDeleteItem]' })
export class DeleteItemDirective {
	onDelete(id: string) {
		this.mutation.mutate({ id }).subscribe();
	}
}
```

## How It Works

The decorator wraps the class constructor. During Angular's DI instantiation — which is an injection context — it resolves the handle via `injectQuery`/`injectMutation`/a WebSocket client, then defines a non-writable property on the instance. If the dependency cannot be resolved, the property stays `undefined`.

When `pollInterval` is set, the interval is automatically cleared on `ngOnDestroy` (the original `ngOnDestroy` is preserved and called first).

## API Reference

| Member                      | Type      | Description                                                                                                           |
| --------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| `@UseQuery(options)`        | decorator | Attaches an `InjectQueryHandle` as `query` (default property name).                                                   |
| `@UseMutation(options)`     | decorator | Attaches an `InjectMutationHandle` as `mutation` (default).                                                           |
| `@UseSubscription(options)` | decorator | Attaches a subscription handle with `data$`, `start()`, `stop()` as `subscription` (default).                         |
| `UseQueryOptions`           | interface | `document`, `variables`, `endpoint`, `property`, `pollInterval`, `skip`, `errorPolicy`, `streamOn`, `placeholderData` |
| `UseMutationOptions`        | interface | `document`, `variables`, `endpoint`, `property`, `optimistic`, `refetchQueries`                                       |
| `UseSubscriptionOptions`    | interface | `document`, `variables`, `endpoint`, `property`                                                                       |
| `UseSubscriptionHandle<T>`  | interface | `data$: Observable<T>`, `start()`, `stop()`                                                                           |
