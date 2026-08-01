---
title: Fragments
slug: fragments
group: Features
order: 5
since: 0.0.1
tags:
  - fragments
  - composable
description: Fragment composition and data masking
---

# @quenetiq/fragments

The fragments package provides utility functions for defining reusable GraphQL fragment documents and composing them into full queries. This promotes colocation of data requirements with the components that use them.

## fragment()

Define a reusable fragment using the `fragment()` helper. This creates a typed document reference that can be spread into queries:

```ts
import { fragment } from '@quenetiq/fragments';

const BOOK_FIELDS = fragment(
	'Book',
	gql`
		fragment BookFields on Book {
			id
			title
			author {
				name
			}
			price
		}
	`,
);
```

## spread()

Use `spread()` to interpolate a fragment into a query document. The spread is resolved at runtime:

```ts
import { spread } from '@quenetiq/fragments';

const BOOKS_QUERY = gql`
	query Books {
		books {
			...BookFields
		}
	}
	${spread(BOOK_FIELDS)}
`;
```

## compose()

When fragments reference other fragments, use `compose()` to assemble them into a single document:

```ts
import { compose } from '@quenetiq/fragments';

const AUTHOR_FIELDS = fragment(
	'Author',
	gql`
		fragment AuthorFields on Author {
			id
			name
			books {
				...BookFields
			}
		}
	`,
);

const fullDocument = compose([BOOK_FIELDS, AUTHOR_FIELDS]);
```

## useFragment()

The `useFragment()` helper extracts a subset of cached data that matches a fragment definition. This ensures a component only re-renders when the fields it cares about change:

```ts
import { useFragment } from '@quenetiq/fragments';

@Component({
	selector: 'app-book-card',
	standalone: true,
	template: `<div>{{ book()?.title }} by {{ book()?.author?.name }}</div>`,
})
export class BookCardComponent {
	book = useFragment(BOOK_FIELDS, this.graphql.query(BOOKS_QUERY));
}
```

## Starters

:::stackblitz starter="fragments"

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"

## API Reference

| Name                           | Description                                                                                     | Type      |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | --------- |
| `fragment(strings, ...values)` | Tagged template literal that defines a typed fragment reference from a GraphQL fragment string. | function  |
| `getFragment(def)`             | Extracts the underlying DocumentNode from a FragmentDefinition.                                 | function  |
| `spread(def)`                  | Returns the fragment spread string (...FragmentName) for use in a GraphQL document.             | function  |
| `compose(...defs)`             | Composes multiple FragmentDefinitions into a single DocumentNode by merging their definitions.  | function  |
| `useFragment(fragment, data)`  | Extracts typed fragment data from a parent query result. Returns null when data is nullish.     | function  |
| `FragmentDefinition`           | Interface defining a typed fragment reference with its parsed DocumentNode and fragment name.   | interface |
| `FragmentDefinition.document`  | The parsed GraphQL DocumentNode for the fragment.                                               | property  |
| `FragmentDefinition.name`      | The name of the fragment extracted from the definition.                                         | property  |
