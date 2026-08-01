# @quenetiq/errors

Typed error classes for GraphQL, network, cache, and validation errors. Includes `ErrorHandler` middleware for centralized error management.

## Usage

```ts
import { ErrorHandler, GraphQLError, NetworkError } from '@quenetiq/errors';

const handler = new ErrorHandler();
handler.on('GRAPHQL_ERROR', (err) => console.error(err));
```
