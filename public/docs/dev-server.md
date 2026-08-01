---
title: Dev Server
slug: dev-server
group: Tools
order: 2
since: 0.0.3
tags: [dev-server, mock]
description: Unified development server
---

# @quenetiq/dev-server

Unified development server for Quenetiq — serves a mock GraphQL backend and proxies all other requests to your frontend dev server. No CORS, no separate terminals, no hassle.

## Quick Start

Run alongside your frontend dev server:

```bash
npx quenetiq-dev --proxy http://localhost:4200
```

This starts a server on port `4000` that serves a mock GraphQL API at `http://localhost:4000/graphql` and proxies all other requests to your frontend.

## Configuration

Create a `quenetiq.config.json` in your project root:

```json
{
	"mock": {
		"schema": "type Query { getNotes: [Note!]! } type Note { id: ID! title: String! content: String! }"
	},
	"proxy": {
		"target": "http://localhost:5173"
	}
}
```

Then just run `quenetiq-dev` without arguments.

You can also pass `--rewrite` to enable automatic URL rewriting for StackBlitz / Codespaces / WebContainers where the frontend URL differs from `localhost`:

```bash
quenetiq-dev --proxy http://localhost:4200 --rewrite
```

## CLI Options

| Flag          | Default                  | Description                                      |
| ------------- | ------------------------ | ------------------------------------------------ |
| `--port`      | `4000`                   | Server port                                      |
| `--proxy`     | `http://localhost:4200`  | Frontend dev server URL                          |
| `--schema`    | `graphql/schema.graphql` | Path to schema file                              |
| `--resolvers` | `mock/resolvers.js`      | Path to resolvers file                           |
| `--config`    | `quenetiq.config.json`   | Path to config file                              |
| `--rewrite`   | `false`                  | Enable URL rewriting for StackBlitz / Codespaces |

## Programmatic API

```typescript
import { createDevServer, startDevServer } from '@quenetiq/dev-server';

const server = createDevServer({
	mock: {
		schema: 'type Query { ping: String }',
		resolvers: { Query: { ping: () => 'pong' } },
	},
	proxy: { target: 'http://localhost:4200' },
});

startDevServer({ port: 4000 });
```

## API Reference

| Name                                                                     | Description                                                                                                                         | Type                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `createDevServer(config?)`                                               | Creates a Node.js http.Server with mock GraphQL endpoint and proxy middleware.                                                      | function                   |
| `startDevServer(config?)`                                                | Creates and starts the dev server on the given port. Waits for the frontend target to become available.                             | function                   |
| `analyzeEnvironment(rewriteOverride?)`                                   | Detects the runtime environment (StackBlitz, Codespaces, or local) and returns environment info including URL rewrite requirements. | function                   |
| `resolvePublicFrontendHost(incomingHost, frontendPort?, devServerPort?)` | Derives the public frontend host from the incoming Host header for URL rewriting in cloud environments.                             | function                   |
| `DevServerConfig`                                                        | Configuration interface for the dev server with mock, proxy, port, spawn, and staticDir options.                                    | interface                  |
| `DevServerConfig.mock`                                                   | Mock GraphQL configuration with inline schema or file path and optional resolvers.                                                  | property                   |
| `DevServerConfig.proxy`                                                  | Proxy configuration for forwarding non-GraphQL requests to the frontend dev server.                                                 | property                   |
| `DevServerConfig.port`                                                   | Port for the dev server to listen on.                                                                                               | property (default: `4000`) |
| `DevServerConfig.spawn`                                                  | Spawn configuration to run a child process (e.g. the frontend dev server).                                                          | property                   |
| `DevServerConfig.staticDir`                                              | Directory to serve static files from, overrides proxy when set.                                                                     | property                   |
| `MockConfig`                                                             | Configuration for mock GraphQL endpoint with inline schema or file path and resolvers.                                              | interface                  |
| `MockConfig.schema`                                                      | Inline GraphQL schema string or file path to a .graphql file.                                                                       | property                   |
| `MockConfig.resolvers`                                                   | Custom resolver functions for mock schema fields.                                                                                   | property                   |
| `ProxyConfig`                                                            | Proxy configuration for forwarding requests to the frontend dev server.                                                             | interface                  |
| `ProxyConfig.target`                                                     | Target URL for the frontend dev server (e.g. `http://localhost:4200`).                                                              | property                   |
| `ProxyConfig.rewrite`                                                    | Force-enables URL rewriting of localhost URLs to public host in proxied responses.                                                  | property                   |
| `RuntimeEnv`                                                             | Union type of supported runtime environments: local, stackblitz, codespaces, or unknown.                                            | interface                  |
| `EnvInfo`                                                                | Environment info including runtime type, URL rewrite requirement, and public frontend host.                                         | interface                  |
| `EnvInfo.runtime`                                                        | Detected runtime environment.                                                                                                       | property                   |
| `EnvInfo.needsUrlRewrite`                                                | Whether absolute localhost URLs should be rewritten to the public host.                                                             | property                   |
| `EnvInfo.publicFrontendHost`                                             | The public-facing host of the frontend dev server if determinable.                                                                  | property                   |

## Starters

:::stackblitz starter="dev-server"
