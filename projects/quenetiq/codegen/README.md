# @quenetiq/codegen

CLI code generation for Quenetiq — generates TypeScript types from your GraphQL schema and typed `gql` exports from `.graphql` files.

## Install

```bash
npm install @quenetiq/codegen
```

## Usage

### Generate types from schema

```typescript
import { generateSchemaTypes, generateSchemaFile } from '@quenetiq/codegen';

const types = generateSchemaTypes(schemaIntrospectionData);
await generateSchemaFile(schema, './graphql/types.ts');
```

### Generate typed documents from `.graphql` files

```typescript
import { findGraphqlFiles, parseGraphqlFile, generateTypedDocumentsCode } from '@quenetiq/codegen';

const files = await findGraphqlFiles('src/**/*.graphql');
const ops = await Promise.all(files.map(file => parseGraphqlFile(file)));
const code = generateTypedDocumentsCode(ops, types);
```

### Merge mode

```typescript
import { mergeGeneratedTypes } from '@quenetiq/codegen';

// Preserves existing types, appends only new ones (avoids diff noise)
const merged = mergeGeneratedTypes('graphql/types.ts', newCode);
```

## API

| Export | Description |
|--------|-------------|
| `generateSchemaTypes(schema, config?)` | Generates TS interfaces/types from introspection data |
| `generateSchemaFile(schema, outputPath, config?)` | Writes generated types to file |
| `mergeGeneratedTypes(filePath, newContent)` | Appends only new types, preserves existing |
| `findGraphqlFiles(pattern)` | Glob‑finds `.graphql` files |
| `parseGraphqlFile(filePath)` | Parses a `.graphql` file into `ParsedOperation[]` |
| `generateTypedDocumentsCode(ops, schemaTypes, prefix?, suffix?)` | Generates typed `gql` exports |
| `generateIndexCode(ops)` | Generates barrel `index.ts` |

## Dependencies

`graphql`, `glob`
