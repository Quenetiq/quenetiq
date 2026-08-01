---
title: 'Streaming'
slug: client-streaming
group: 'Core'
order: 4
since: '0.0.1'
tags: [client, streaming, defer, stream, multipart]
description: 'Stream incremental @defer and @stream responses'
---

# Streaming

Support for `@defer` and `@stream` directives via multipart/mixed responses.

```typescript
import { createClient, gql, isSuccess } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const stream = client.queryStream(gql`
	query StreamCharacters {
		characters @defer {
			name
			friends @stream {
				name
			}
		}
	}
`);

for await (const part of stream) {
	if (isSuccess(part)) {
		console.log('incremental:', part.data);
	}
}
```

## API Reference

| Member                                         | Type   | Description                                                                 |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `queryStream(document, variables?, endpoint?)` | method | Returns an `AsyncIterable` for `@defer`/`@stream` multipart/mixed responses |
