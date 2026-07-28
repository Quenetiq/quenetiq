# @quenetiq/file-upload

GraphQL multipart file upload support ([graphql-multipart-request-spec](https://github.com/jaydenseric/graphql-multipart-request-spec)).

## Install

```bash
npm install @quenetiq/file-upload
```

## Quick Start

```typescript
import { UploadService, hasFiles } from '@quenetiq/file-upload';

class MyComponent {
  private upload = inject(UploadService);
  private graphql = inject(GraphqlService);

  async uploadFile(file: File) {
    const vars = { file }; // File/Blob auto-detected in nested values
    if (hasFiles(vars)) {
      return this.upload.upload<{ url: string }>(
        gql`mutation Upload($file: Upload!) { uploadFile(file: $file) { url } }`,
        vars,
      );
    }
    // Regular mutation
    return this.graphql.mutate(…);
  }
}
```

## API

| Export | Description |
|--------|-------------|
| `UploadService` | Injectable — builds `FormData` with operations/map, sends via `HttpClient` |
| `hasFiles(value)` | Recursively checks if a value tree contains `File` or `Blob` |
| `FileEntry` | `{ path: string; file: Blob }` |

## Note

The core `GraphqlService.mutate()` automatically delegates to file upload when it detects `File`/`Blob` in variables.

## Dependencies

`@angular/common`, `@angular/core`, `@quenetiq/core`, `rxjs`
