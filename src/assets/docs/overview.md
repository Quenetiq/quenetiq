---
title: "Overview"
slug: overview
group: "Getting Started"
order: 1
since: "0.0.1"
tags: []
description: "Introduction to Quenetiq"
---

# Overview

The Pragmatic GraphQL Client for Any Framework

A modular, tree-shakeable GraphQL client with framework-agnostic core and bindings for React, Vue, and
Angular. Each capability in its own
`@quenetiq/*` package — you pay only for what you use.

> **20 packages · ~25 kB total · Angular 22+ · React 18+ · Vue 3+ · Tree-shakeable**

[![CI Status](https://github.com/Quenetiq/quenetiq/actions/workflows/ci.yml/badge.svg)](https://github.com/Quenetiq/quenetiq/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/codecov/c/github/Quenetiq/quenetiq)](https://codecov.io/gh/Quenetiq/quenetiq)
[![npm version](https://badge.fury.io/js/@quenetiq%2Fcore.svg)](https://www.npmjs.com/package/@quenetiq/core)

> **If you're tired of:** framework bindings that lag 6 months behind every major release · fighting React idioms in Angular tests · installing 3 third-party packages just to upload a file · writing 50 lines of `typePolicies` to make normalized cache work
>
> **Quenetiq fixes all of this.** One `npm install` and you're done. Angular-native, Signals-ready, zero-config cache, built-in middleware — every feature works out of the box.

## Packages

| | Package | Description |
|---|---|---|
| ⚡ | [**@quenetiq/client**](/docs/client) | Framework-agnostic GraphQL client — query, mutate, streaming, middleware, cache. |
| ⚛️ | [**@quenetiq/react**](/docs/react) | React hooks, render-prop components, QuenetiqProvider context. |
| 💚 | [**@quenetiq/vue**](/docs/vue) | Vue composables, plugin, SSR support via onServerPrefetch. |
| ⚡ | [**@quenetiq/core**](/docs/core) | GraphqlService, middleware, gql tag, pipes, standalone helpers, reactive variables. |
| 💾 | [**@quenetiq/cache**](/docs/cache) | Normalized cache, optimistic updates, GC, persistence, type policies. |
| 🔌 | [**@quenetiq/subscriptions**](/docs/subscriptions) | WebSocket subscriptions via graphql-transport-ws with auto-reconnect. |
| 📎 | [**@quenetiq/file-upload**](/docs/file-upload) | Multipart upload spec, auto File/Blob detection, progress tracking. |
| 🔀 | [**@quenetiq/middlewares**](/docs/middlewares) | Auth refresh, retry, focus refetch, offline queue — composable. |
| 📄 | [**@quenetiq/pagination**](/docs/pagination) | Offset, cursor, and relay-style pagination helpers. |
| ⚡ | [**@quenetiq/persisted-queries**](/docs/persisted-queries) | APQ middleware with SHA-256 hashing and auto-registration. |
| 🧩 | [**@quenetiq/fragments**](/docs/fragments) | Fragment composition, spread, useFragment for data masking. |
| 🖥️ | [**@quenetiq/ssr**](/docs/ssr) | SSR stream service, transfer state cache, chunked transfer. |
| 🔍 | [**@quenetiq/debugging**](/docs/debugging) | Browser extension, DevTools service, field tree parser, mutation chart. |
| 📡 | [**@quenetiq/opentelemetry**](/docs/opentelemetry) | W3C Trace Context propagation, middleware, Angular integration. |
| 📦 | [**@quenetiq/downloader**](/docs/downloader) | Introspection to JSON + SDL, schema download & store. |
| 🧪 | [**@quenetiq/testing**](/docs/testing) | MockGraphqlService, when/respond, testing utilities. |
| 🔄 | [**@quenetiq/apollo-adapter**](/docs/apollo-adapter) | Migration helpers — bring your Apollo cache, type policies, and links. |
| 🏗️ | [**@quenetiq/codegen**](/docs/codegen) | Typed codegen client preset, fragment masking, schema merge. |
| ⚠️ | [**@quenetiq/errors**](/docs/errors) | Typed error system — QuenetiqError, error codes, error handlers. |

## Why Quenetiq?

Existing GraphQL clients are either framework-locked (Apollo primarily targets React), overly complex (Relay),
or too simplistic. Quenetiq is designed with a framework-agnostic core and first-class bindings for React, Vue,
and Angular, keeping each package small enough that the entire library adds less than 25 kB to your production
bundle.

- **Zero config normalized cache** — just `__typename` + `id`, no `typePolicies`
- **Built-in middleware ecosystem** — auth, retry, offline queue, auto mock, APQ, batching
- **Framework-native** — Angular Signals, React hooks, Vue composables. Not ports.
- **Offline-first** — mutation queue with localStorage persistence, auto-replay on reconnect
- **Live Queries** — real-time data with WebSocket fallback in all frameworks
- **Zero config cache** — auto entity normalization, no typePolicies
- **Modular** — 15 independent packages, import only what you use
- **SSR ready** — hydration, transfer state, chunked transfer
- **Strongly typed** — phantom-typed DocumentNode, optional codegen
- **Built-in DevTools** — no browser extension needed

## Getting Started

Ready to dive in? Head over to the [Getting Started](/docs/getting-started) guide which walks you through installation, configuration, and your first query.
