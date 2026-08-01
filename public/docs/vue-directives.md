---
title: 'Directives'
slug: vue-directives
group: 'Frameworks'
order: 7
since: '0.0.1'
tags: [vue, directives, mutation, loading]
description: 'Vue directives for declarative mutations and loading state.'
---

# Directives

Registered automatically via `createQuenetiqPlugin`, or manually with `registerDirectives`.

## v-qtq-mutate

Triggers a mutation on click. Accepts a string (mutation document) or `{ mutation, variables }` object.

```html
<button v-qtq-mutate="{ mutation: 'mutation { like }', variables: { id: 1 } }">Like</button>
```

## v-qtq-loading

Toggles the `.qtq-loading` CSS class on the element based on a boolean expression.

```html
<div v-qtq-loading="isLoading">Content</div>
```

## API

| Name                              | Description                                                                | Type      |
| --------------------------------- | -------------------------------------------------------------------------- | --------- |
| `registerDirectives(app, client)` | Registers `v-qtq-mutate` and `v-qtq-loading` on an app instance.           | function  |
| `v-qtq-mutate`                    | On click, executes a mutation. Value: string or `{ mutation, variables }`. | directive |
| `v-qtq-loading`                   | Toggles `.qtq-loading` CSS class based on boolean binding.                 | directive |
