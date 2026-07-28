---
title: Codegen
slug: codegen
group: Tools
order: 1
since: "0.0.1"
tags:
  - codegen
  - cli
description: CLI code generation
---

# @quenetiq/codegen

Type-safe GraphQL code generation. CLI tool that produces typed `DocumentNode` objects, fragment masking types, and optional runtime-less client preset.

## Overview

`@quenetiq/codegen` scans your schema and GraphQL document files, then generates TypeScript types and typed `DocumentNode` exports. No `graphql` package needed at runtime when using the client preset — the `DocumentNode` is inlined as a string.

## CLI Usage

Run `quenetiq-codegen` via npx or as an npm script. It accepts a schema file/URL, document globs, and an output directory.

```bash
npx quenetiq-codegen --schema ./schema.graphql --documents './src/**/*.graphql' --out ./src/gql/
```

## Typed Documents

The generated output exports a `graphql` template tag that returns `TypedDocumentNode`, giving you fully typed query results and variables.

```typescript
import { graphql } from '../gql';

const GET_TODOS = graphql(`
  query GetTodos {
    todos { id title }
  }
`);

// typeof GET_TODOS is TypedDocumentNode<GetTodosQuery, GetTodosQueryVariables>
```

## Fragment Masking

With the `fragmentMasking` option, codegen generates `FragmentRef` types. Components receive opaque fragment references and must use `useFragment` to access the data — enforcing data masking at the type level.

```typescript
import { graphql, FragmentRef, useFragment } from '../gql';

const TodoFields = graphql(`
  fragment TodoFields on Todo {
    id title completed
  }
`);

// FragmentRef ensures data masking at type level
function TodoItem({ todo }: { todo: FragmentRef<typeof TodoFields> }) {
  const data = useFragment(TodoFields, todo);
  return <p>{data.title}</p>;
}
```

## API Reference

### CLI

| Name | Type | Description |
|------|------|-------------|
| `quenetiq-codegen` | cli | CLI tool that scans schema and GraphQL documents, generates typed DocumentNode exports and fragment masking types. |

### Generated Exports

| Name | Type | Description |
|------|------|-------------|
| `` graphql`...` `` | function | Generated template tag that returns TypedDocumentNode with fully typed query results and variables. |
| `FragmentRef<T>` | type | Generated opaque fragment reference type that enforces data masking at the type level. |
| `useFragment(fragment, ref)` | function | Generated function that unwraps a FragmentRef to access the underlying fragment data. |

### Schema Generation

| Name | Type | Description |
|------|------|-------------|
| `generateSchemaTypes(schema, config?)` | function | Generates TypeScript interface/type/enum code from schema introspection data. |
| `generateSchemaFile(schema, outputPath, config?)` | function | Generates schema types and writes to a file, with optional merge mode. |

### SchemaData

Schema introspection data with types and root operation types.

| Name | Type | Description |
|------|------|-------------|
| `SchemaData.types` | property | Array of all schema types. |
| `SchemaData.queryType` | property | Root Query type name. |
| `SchemaData.mutationType` | property | Root Mutation type name. |
| `SchemaData.subscriptionType` | property | Root Subscription type name. |

### SchemaType

A single schema type with kind, fields, input fields, enum values.

| Name | Type | Description |
|------|------|-------------|
| `SchemaType.name` | property | Type name. |
| `SchemaType.kind` | property | Type kind (OBJECT, INPUT_OBJECT, ENUM, UNION, etc.). |

### Types

| Name | Type | Description |
|------|------|-------------|
| `CodegenScalars` | type | Custom scalar-to-TypeScript type mapping. |

### File Utilities

| Name | Type | Description |
|------|------|-------------|
| `findGraphqlFiles(pattern)` | function | Globs for GraphQL document files matching a pattern. |
| `parseGraphqlFile(filePath)` | function | Parses a .graphql file into a ParsedOperation. |

### ParsedOperation

Parsed operation with name, type, variables, document, and file path.

| Name | Type | Description |
|------|------|-------------|
| `ParsedOperation.name` | property | Operation name. |
| `ParsedOperation.type` | property | Operation type: query, mutation, or subscription. |
| `ParsedOperation.variables` | property | Variable definitions with name and type. |
| `ParsedOperation.document` | property | Raw GraphQL document string. |
| `ParsedOperation.filePath` | property | Absolute file path. |

### OperationVar

A single operation variable with name and GraphQL type string.

| Name | Type | Description |
|------|------|-------------|
| `OperationVar.name` | property | Variable name. |
| `OperationVar.type` | property | GraphQL type string (e.g. `String!`, `[Int]`). |

### Document Code Generation

| Name | Type | Description |
|------|------|-------------|
| `generateTypedDocumentsCode(operations, schemaTypes?, options?, fragmentTypes?)` | function | Generates typed DocumentNode exports from parsed operations. |

### DocumentCodegenOptions

Options for generating typed document code.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `DocumentCodegenOptions.prefix` | property | `—` | Prefix for generated result type names. |
| `DocumentCodegenOptions.suffix` | property | `—` | Suffix for generated result type names. |
| `DocumentCodegenOptions.clientPreset` | property | `false` | Generate `createTypedQuery()` instead of gql tag. |

### FragmentTypeInfo

Metadata for a fragment type used in document generation.

| Name | Type | Description |
|------|------|-------------|
| `FragmentTypeInfo.name` | property | Fragment name. |
| `FragmentTypeInfo.keyName` | property | Fragment key reference name. |
| `FragmentTypeInfo.typeCondition` | property | GraphQL type the fragment is on. |
| `FragmentTypeInfo.importRelative` | property | Relative import path to the fragment file. |

### Index & Merge

| Name | Type | Description |
|------|------|-------------|
| `generateIndexCode(operations)` | function | Generates a barrel index file re-exporting all operations. |
| `mergeGeneratedTypes(existingFilePath, newContent)` | function | Merges new type definitions into existing file preserving line positions. |

### Fragment Parsing & Code Generation

| Name | Type | Description |
|------|------|-------------|
| `parseFragmentFile(filePath)` | function | Parses a .graphql file extracting all fragment definitions. |
| `generateFragmentCode(fragments, typesCode?, clientPreset?)` | function | Generates typed fragment code with FragmentRef key types. |
| `generateFragmentIndex(fragments)` | function | Generates a barrel index file re-exporting all fragments. |

### ParsedFragment

A parsed GraphQL fragment with name, type condition, and fields.

| Name | Type | Description |
|------|------|-------------|
| `ParsedFragment.name` | property | Fragment name. |
| `ParsedFragment.typeCondition` | property | GraphQL type the fragment applies to. |
| `ParsedFragment.fields` | property | Selected field names. |
| `ParsedFragment.inlineFragments` | property | Inline fragment type conditions. |
| `ParsedFragment.document` | property | Raw GraphQL document string. |
| `ParsedFragment.filePath` | property | Absolute file path. |

## Starters

:::stackblitz starter="codegen"
