# @quenetiq/downloader

Node.js CLI tool to download a GraphQL schema via introspection and save it as JSON + SDL.

## Install

```bash
npm install @quenetiq/downloader
```

## Usage

```typescript
import { downloadAndStoreSchema } from '@quenetiq/downloader';

await downloadAndStoreSchema({
  endpoint: 'https://api.example.com/graphql',
  outputDir: './schema',
  headers: { Authorization: 'Bearer …' },
});
```

This creates `schema/schema.graphql` and `schema/schema.json`.

## API

| Export | Description |
|--------|-------------|
| `downloadAndStoreSchema(options)` | Fetches introspection, writes `.graphql` and `.json` files |
| `DownloaderOptions` | `{ endpoint: string; outputDir: string; headers?: Record<string, string> }` |

## Dependencies

`graphql`
