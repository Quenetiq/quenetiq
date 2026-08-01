# @quenetiq/dev-server

Unified development server for Quenetiq — serves a mock GraphQL backend and proxies all other requests to your frontend dev server. No CORS, no separate terminals, no hassle.

## Install

```bash
npm install @quenetiq/dev-server
```

## Usage

### CLI

```bash
quenetiq-dev --proxy http://localhost:4200
```

This starts a server on port `4000` that:

- Serves a mock GraphQL API at `http://localhost:4000/graphql`
- Proxies all other requests to `http://localhost:4200` (your frontend)

### Configuration via `quenetiq.config.json`

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

### With Schema + Resolvers

```bash
quenetiq-dev --schema ./graphql/schema.graphql --resolvers ./mock/resolvers.js
```

### Programmatic API

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

## API

| Export                     | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `createDevServer(config?)` | Creates a Node.js `http.Server` with GraphQL + proxy |
| `startDevServer(config?)`  | Creates and starts the server on the given port      |

## CLI Options

| Flag          | Default                  | Description             |
| ------------- | ------------------------ | ----------------------- |
| `--port`      | `4000`                   | Server port             |
| `--proxy`     | `http://localhost:4200`  | Frontend dev server URL |
| `--schema`    | `graphql/schema.graphql` | Path to schema file     |
| `--resolvers` | `mock/resolvers.js`      | Path to resolvers file  |
| `--config`    | `quenetiq.config.json`     | Path to config file     |

## Dependencies

`graphql`, `graphql-yoga`
