import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { generateSchemaTypes, generateIndexCode, findGraphqlFiles, parseGraphqlFile, generateTypedDocumentsCode } from '@quenetiq/codegen';
import { loadConfig } from './load-config.mjs';

async function run() {
  const { config } = await loadConfig(process.cwd());
  const codegen = config.codegen ?? config;

  const schemaDir = resolve(process.cwd(), codegen.schema?.dir ?? './schema');
  const typesDir = resolve(process.cwd(), codegen.types?.dir ?? './src/graphql/types');
  const filename = codegen.schema?.filename ?? 'schema.json';
  const schemaPath = join(schemaDir, filename);

  const autoDownloadSchema = codegen.schema?.autoDownloadSchema
    || codegen.schema?.autoDownload
    || config.autoDownloadSchema
    || config.autoDownload;

  const shouldDownload = autoDownloadSchema || (!existsSync(schemaPath) && codegen.schema?.endpoint);

  if (shouldDownload && codegen.schema?.endpoint) {
    console.log(`Auto-downloading schema from ${codegen.schema.endpoint}...`);
    try {
      const { downloadAndStoreSchema } = await import('@quenetiq/downloader');
      await downloadAndStoreSchema({
        endpoint: codegen.schema.endpoint,
        outputDir: schemaDir,
        filename,
        headers: codegen.schema.headers,
      });
      console.log('Schema downloaded successfully.');
    } catch (err) {
      if (!existsSync(schemaPath)) {
        console.error(`Failed to auto-download schema: ${err.message}`);
        process.exit(1);
      } else {
        console.warn(`Warning: Failed to update schema, using cached version: ${err.message}`);
      }
    }
  } else if (!existsSync(schemaPath)) {
    console.error(`Schema not found at ${schemaPath}. Run \`npm run schema:download\` first.`);
    process.exit(1);
  }

  const schemaRaw = readFileSync(schemaPath, 'utf-8');
  const schemaData = JSON.parse(schemaRaw).__schema ?? JSON.parse(schemaRaw);

  if (!existsSync(typesDir)) mkdirSync(typesDir, { recursive: true });

  const types = codegen.types ?? {};
  const typesCode = generateSchemaTypes(schemaData, {
    scalars: types.scalars ?? {},
    enumsAsTypes: types.enumsAsTypes ?? false,
    maybeValue: types.maybeValue ?? 'T | null | undefined',
    operationResultPrefix: types.operationResultPrefix ?? '',
    operationResultSuffix: types.operationResultSuffix ?? 'Result',
  });

  const outputPath = join(typesDir, 'index.ts');

  if (codegen.types?.merge) {
    const { mergeGeneratedTypes } = await import('@quenetiq/codegen');
    const content = mergeGeneratedTypes(outputPath, typesCode);
    writeFileSync(outputPath, content);
    console.log(`Types merged: ${outputPath}`);
  } else {
    writeFileSync(outputPath, typesCode);
    console.log(`Types generated: ${outputPath}`);
  }

  // Generate typed documents from .graphql files
  const graphqlPattern = codegen.documents ?? 'src/**/*.graphql';
  const files = findGraphqlFiles(graphqlPattern);

  if (files.length > 0) {
    const operations = files.map((f) => parseGraphqlFile(f)).filter(Boolean);
    if (operations.length > 0) {
      const docsDir = join(typesDir, 'documents');
      if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
      for (const op of operations) {
        const code = generateTypedDocumentsCode([op], typesCode);
        writeFileSync(join(docsDir, `${op.name}.ts`), code);
      }
      writeFileSync(join(docsDir, 'index.ts'), generateIndexCode(operations));
      console.log(`Generated ${operations.length} typed document(s) in ${docsDir}`);
    }
  } else {
    console.log('No .graphql files found matching pattern:', graphqlPattern);
  }
}

run();
