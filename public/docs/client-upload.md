---
title: 'File Upload'
slug: client-upload
group: 'Core'
order: 5
since: '0.0.1'
tags: [client, upload, file, blob, multipart]
description: 'Automatic file upload with multipart spec'
---

# File Upload

Automatic `File` / `Blob` / `FileList` detection with multipart upload spec.

```typescript
import { createClient, gql, isSuccess } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const UPLOAD_FILE = gql`
	mutation UploadFile($file: Upload!) {
		uploadFile(file: $file) {
			url
		}
	}
`;

const result = await client.mutate(UPLOAD_FILE, {
	file: fileInput.files[0],
});

if (isSuccess(result)) {
	console.log('Uploaded:', result.data.url);
}
```

When `File`, `Blob`, or `FileList` values are detected in variables, the client automatically switches to `multipart/form-data` encoding per the GraphQL multipart request spec.

## API Reference

| Member                                    | Type   | Description                                                                           |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `mutate(document, variables?, endpoint?)` | method | Executes mutation with automatic multipart upload for `File`/`Blob`/`FileList` values |
