---
title: "File Upload"
slug: file-upload
group: "Features"
order: 3
since: "0.0.1"
tags: [upload, multipart]
description: "Multipart file upload"
---

# @quenetiq/file-upload

The file-upload package provides seamless file upload support for GraphQL mutations using the GraphQL multipart request spec. It automatically detects `File`, `Blob`, and `FileList` values in mutation variables and serializes them as multipart/form-data.

## UploadService

`UploadService` extends the standard mutation pipeline to handle file uploads. The service wraps `GraphqlService.mutate()` with automatic multipart encoding:

```ts
import { UploadService, gql } from '@quenetiq/file-upload';

const upload = inject(UploadService);

const result = await upload.mutate(
  gql`mutation UploadFile($file: Upload!) {
    uploadFile(file: $file) { url size }
  }`,
  { file: fileInputElement.files[0] },
);
```

## GraphQL Multipart Request Spec

Quenetiq implements the [GraphQL Multipart Request Spec](https://github.com/jaydenseric/graphql-multipart-request-spec). When Quenetiq detects `File`, `Blob`, or `FileList` values in variables, it automatically switches from JSON `application/json` to `multipart/form-data` encoding.

Each file is mapped to a `null` placeholder in the operations JSON and appended as a separate part in the multipart body, exactly as the spec requires.

## Auto File / Blob Detection

The detection walks the variables object tree recursively. Nested objects, arrays, and `FileList` are handled transparently:

```ts
const result = await upload.mutate(
  gql`mutation UploadAvatar($avatar: Upload!, $metadata: AvatarInput!) {
    uploadAvatar(avatar: $avatar, metadata: $metadata) { url }
  }`,
  {
    avatar: fileInput.files[0],
    metadata: { userId: '123', crop: { x: 0, y: 0, w: 200, h: 200 } },
  },
);
```

## API Reference

### UploadService

| Name | Description | Type |
|------|-------------|------|
| `UploadService` | Injectable Angular service that wraps GraphQL mutations with automatic multipart encoding for File/Blob values. | class |
| `UploadService.upload(document, variables)` | Uploads a file-backed mutation. Detects File/Blob values, builds multipart FormData, and POSTs to the GraphQL endpoint. | method |

### FileEntry

| Name | Description | Type |
|------|-------------|------|
| `FileEntry` | Interface representing a single file entry extracted from mutation variables. | interface |
| `FileEntry.path` | Dot-notation path to the file within the variables object (e.g. variables.avatar). | property |
| `FileEntry.file` | The File or Blob object. | property |

### Functions

| Name | Description | Type |
|------|-------------|------|
| `hasFiles(value)` | Recursively checks if a value or any nested value is a File or Blob instance. | function |

## Starters

:::stackblitz starter="file-upload"

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"
