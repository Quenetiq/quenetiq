---
title: 'ESLint Plugin'
slug: eslint-plugin
group: 'Tools'
order: 6
since: '1.0.6-beta'
tags: [eslint, lint, gql, graphql, rules]
description: 'eslint-plugin-quenetiq: GraphQL lint rules for gql templates'
---

# ESLint Plugin

`@quenetiq/eslint-plugin-gql` is an ESLint plugin that understands the Quenetiq GraphQL API surface. It parses the GraphQL documents embedded in `gql` tagged templates and `createTypedQuery()` strings at lint time and reports real GraphQL errors in your editor and CI — no separate GraphQL IDE or schema needed.

## Setup

```bash
npm install --save-dev @quenetiq/eslint-plugin-gql
```

Register the plugin in `eslint.config.ts`:

```typescript
import { quenetiqPlugin } from '@quenetiq/eslint-plugin-gql';

export default tseslint.config(
	{
		plugins: { quenetiq: quenetiqPlugin },
		rules: {
			'quenetiq/gql-parse': 'error',
			'quenetiq/gql-named-operations': 'error',
		},
	},
	// ...
);
```

## Rules

### `quenetiq/gql-parse`

Validates that every `gql`/`graphql` tagged template (and every string passed to `createTypedQuery()`) contains valid GraphQL syntax, using `graphql.parse()`.

```typescript
const GET_USER = gql`
	query GetUser {
		user {
			id
		}
	}
`; // ok

const BROKEN = gql`
  query Broken {
    user { @invalid ((
  }
`; // error: Expected Name, found "@"
```

Errors point at the exact offending token inside the template.

### `quenetiq/gql-named-operations`

Requires every `query`, `mutation`, and `subscription` to have an explicit name. Named operations can be cached, invalidated, and debugged; anonymous operations cannot be identified after the request is sent.

```typescript
const GET_USER = gql`
	query GetUser {
		user {
			id
		}
	}
`; // ok

const BROKEN = gql`
	{
		user {
			id
		}
	}
`; // error: GraphQL query operations must be named
```

## Shared Options

Both rules accept the following options:

| Option              | Type       | Default              | Description                                                                                                                                            |
| ------------------- | ---------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tags`              | `string[]` | `['gql', 'graphql']` | Tag names treated as GraphQL templates. Add aliases or custom re-exports here.                                                                         |
| `checkTypedQueries` | `boolean`  | `true`               | Also check string literals passed to `createTypedQuery()`.                                                                                             |
| `skipInterpolated`  | `boolean`  | `true`               | Skip templates containing `${...}` interpolation. Interpolated templates are a supported fragment-composition feature and cannot be statically parsed. |
| `disabled`          | `boolean`  | `false`              | Fully disable the rule. Escape hatch for per-file overrides that keep the plugin registered.                                                           |
| `parseOptions`      | `object`   | —                    | Options passed through to `graphql.parse()`: `noLocation`, `maxTokens`, `experimentalFragmentArguments`.                                               |

```typescript
'quenetiq/gql-parse': [
  'error',
  {
    tags: ['gql', 'myGql'],
    parseOptions: { experimentalFragmentArguments: true },
  },
],
```

## `quenetiq/gql-named-operations` Options

| Option             | Type                                      | Default | Description                                                         |
| ------------------ | ----------------------------------------- | ------- | ------------------------------------------------------------------- |
| `allowAnonymous`   | `boolean`                                 | `false` | Allow anonymous operations (e.g. auto-generated persisted queries). |
| `ignoreOperations` | `('query'\|'mutation'\|'subscription')[]` | `[]`    | Operation kinds exempt from the naming requirement.                 |
| `allowInSpec`      | `boolean`                                 | `false` | Skip `*.spec.*` test files, where anonymous queries are common.     |

## Library Feature Compatibility

The defaults are tuned for the Quenetiq feature set, so the rules never false-positive on supported API:

- **Fragment composition** via `${...}` interpolation is skipped by default (`skipInterpolated: true`).
- **`createTypedQuery()` strings** are validated like templates (`checkTypedQueries: true`).
- **Codegen output** (`@quenetiq/codegen` client preset) emits pre-serialized strings that are not `gql` templates and are left untouched.
- **Test files** can opt out of the naming rule with `allowInSpec` or the spec override block in `eslint.config.ts`.
- **Experimental parser features** (fragment arguments) can be enabled through `parseOptions`.
- **`noLocation: true`** parse results are handled gracefully — the naming rule reports at the template start instead of crashing.
- **Per-file overrides** compose with flat config blocks, so the rules can be tuned per directory:

```typescript
{
  files: ['**/*.spec.ts'],
  rules: { 'quenetiq/gql-named-operations': ['error', { allowInSpec: true }] },
},
```

## Type-Safe Options

Rule options are validated against JSON schemas, so typos are rejected at config load:

```
Value {"unknownOption":1} should NOT have additional properties.
Unexpected property "unknownOption". Expected properties: "tags", "checkTypedQueries", ...
```
