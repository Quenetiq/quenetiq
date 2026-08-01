---
title: 'Components'
slug: react-components
group: 'Frameworks'
order: 7
since: '0.0.1'
tags: [react, components]
description: 'RateLimitGate and render-prop components: Query, Mutation, Subscription.'
---

# Components

## RateLimitGate

Wraps your UI and shows a fallback banner when rate-limited. Runs a countdown and fires `onRetry` when elapsed.

```tsx
import { RateLimitGate } from '@quenetiq/react';

function App() {
	return (
		<RateLimitGate isLimited={limited} retryAfter={5000} onRetry={refetch}>
			<MainUI />
		</RateLimitGate>
	);
}
```

| Prop         | Type         | Default         | Description                       |
| ------------ | ------------ | --------------- | --------------------------------- |
| `isLimited`  | `boolean`    | —               | Whether rate limit is exceeded    |
| `children`   | `ReactNode`  | —               | Normal UI                         |
| `fallback`   | `ReactNode`  | Built-in banner | Custom fallback UI                |
| `retryAfter` | `number`     | `5000`          | Countdown in ms                   |
| `onRetry`    | `() => void` | —               | Callback when countdown completes |
| `error`      | `string`     | —               | Error message in default banner   |

## Render-prop Components

Alternative to hooks — useful in class components or inline query logic.

### Query

```tsx
import { Query, gql } from '@quenetiq/react';

<Query
	document={gql`
		query {
			todos {
				id
				title
			}
		}
	`}
>
	{({ data, loading }) => (loading ? <p>Loading…</p> : data.todos.map((t) => <p key={t.id}>{t.title}</p>))}
</Query>;
```

### Mutation

```tsx
import { Mutation, gql } from '@quenetiq/react';

<Mutation
	document={gql`
		mutation AddTodo($title: String!) {
			addTodo(title: $title) {
				id
			}
		}
	`}
>
	{(mutate, { loading }) => (
		<button onClick={() => mutate({ title: 'New' })} disabled={loading}>
			Add
		</button>
	)}
</Mutation>;
```

### Subscription

```tsx
import { Subscription, gql } from '@quenetiq/react';

<Subscription
	document={gql`
		subscription OnMessage {
			messageAdded {
				content
			}
		}
	`}
>
	{({ data }) => <p>{data?.messageAdded?.content}</p>}
</Subscription>;
```

## Render-prop Props

| Component      | Key Props                                                               |
| -------------- | ----------------------------------------------------------------------- |
| `Query`        | `document`, `variables?`, `pollInterval?`, `skip?`, `children`          |
| `Mutation`     | `document`, `variables?`, `update?`, `children`                         |
| `Subscription` | `document`, `variables?`, `wsEndpoint?`, `shouldSubscribe?`, `children` |
