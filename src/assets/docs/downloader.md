---
title: "@quenetiq/downloader"
slug: downloader
group: Tools
order: 3
since: "0.0.1"
tags: [schema, download, introspection]
description: "Node.js CLI tool to download a GraphQL schema via introspection"
---

The downloader package provides a utility for downloading GraphQL schemas via introspection. It saves the
result as both `schema.json` (introspection result) and `schema.graphql` (SDL format)
for use with code generation tools and IDE support.

## downloadAndStoreSchema()

Use `downloadAndStoreSchema` to introspect any GraphQL endpoint and save the schema locally:

```ts
import { downloadAndStoreSchema } from '@quenetiq/downloader';

const result = await downloadAndStoreSchema({
  url: 'https://api.example.com/graphql',
  headers: { Authorization: `Bearer ${token}` },
  outputDir: './schema',
});

console.log(result);
// {
//   introspectionUrl: '/schema/schema.json',
//   sdlUrl: '/schema/schema.graphql',
//   timestamp: '2025-06-27T12:00:00Z',
// }
```

## Output Structure

The downloader creates the following directory structure:

```
// Output structure
schema/
├── schema.json       # Raw introspection result
├── schema.graphql    # SDL format
└── meta.json         # Metadata (timestamp, url, query count)
```

## API Reference

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `downloadAndStoreSchema(options)` | Downloads a GraphQL schema via introspection and saves schema.json and schema.graphql files. Returns paths to both files. | function | |
| `DownloaderOptions` | Configuration interface for schema download with endpoint URL, output directory, optional filename, and headers. | interface | |
| `DownloaderOptions.endpoint` | GraphQL endpoint URL to introspect. | property | |
| `DownloaderOptions.outputDir` | Directory path where the schema files will be saved. | property | |
| `DownloaderOptions.filename` | Custom filename for the schema JSON file. The SDL file derives its name from this. | property | `schema.json` |
| `DownloaderOptions.headers` | Additional HTTP headers for the introspection request (e.g. Authorization). | property |

## Starters

:::stackblitz starter="downloader" |
