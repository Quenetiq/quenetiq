import { readFileSync, writeFileSync, mkdirSync, existsSync, watch } from 'fs';
import { join, resolve, dirname } from 'path';
import {
  generateSchemaTypes,
  findGraphqlFiles,
  parseGraphqlFile,
  generateTypedDocumentsCode,
  generateIndexCode,
  parseFragmentFile,
  generateFragmentCode,
  generateFragmentIndex,
  type FragmentTypeInfo,
} from '@quenetiq/codegen';

const args = process.argv.slice(2);
const cwd = process.cwd();

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config': case '-c': opts.configPath = args[++i]; break;
      case '--watch': case '-w': opts.watch = true; break;
      case '--schema-only': opts.schemaOnly = true; break;
      case '--documents-only': opts.documentsOnly = true; break;
      case '--client-preset': opts.clientPreset = true; break;
      case '--output': case '-o': opts.output = args[++i]; break;
      case '--help': case '-h':
        console.log(`
Usage: quenetiq-codegen [options]

Options:
  --config, -c <path>     Config file path (default: quenetiq.config.*)
  --watch, -w             Watch .graphql files for changes
  --schema-only           Generate only schema types
  --documents-only        Generate only typed documents from .graphql files
  --client-preset         Generate createTypedQuery() instead of gql — skips runtime parse()
  --output, -o <dir>      Output directory for generated types
  --help, -h              Show this help
`);
        process.exit(0);
    }
  }
  return opts;
}

function loadConfigSync(cwd, configPath) {
  const candidates = configPath
    ? [configPath]
    : ['quenetiq.config.ts', 'quenetiq.config.mjs', 'quenetiq.config.json'];

  for (const file of candidates) {
    const fullPath = resolve(cwd, file);
    if (!existsSync(fullPath)) continue;

    const ext = file.split('.').pop();
    if (ext === 'json') {
      return JSON.parse(readFileSync(fullPath, 'utf-8'));
    }
    if (ext === 'ts' || ext === 'mjs') {
      return { __path: fullPath, __format: ext };
    }
  }

  return {};
}

async function loadConfig(cwd, configPath) {
  const cfgRaw = loadConfigSync(cwd, configPath);
  if (cfgRaw.__format === 'ts' || cfgRaw.__format === 'mjs') {
    const mod = await import(cfgRaw.__path);
    return mod.default ?? mod;
  }
  return cfgRaw;
}

async function generateSchemaTypesFromFile(schemaFile, typesDir, typesConfig, opts) {
  if (!existsSync(schemaFile)) {
    console.error(`Schema not found: ${schemaFile}`);
    process.exit(1);
  }

  const schemaRaw = readFileSync(schemaFile, 'utf-8');
  const schemaData = JSON.parse(schemaRaw).__schema ?? JSON.parse(schemaRaw);
  const scalars = typesConfig.scalars ?? {};
  const enumsAsTypes = typesConfig.enumsAsTypes ?? false;
  const maybeValue = typesConfig.maybeValue ?? 'T | null | undefined';

  const typesCode = generateSchemaTypes(schemaData, {
    scalars,
    enumsAsTypes,
    maybeValue,
  });

  if (!existsSync(typesDir)) mkdirSync(typesDir, { recursive: true });

  const outputPath = opts.output
    ? resolve(cwd, opts.output, 'index.ts')
    : join(typesDir, 'index.ts');

  if (typesConfig.merge) {
    const { mergeGeneratedTypes } = await import('@quenetiq/codegen');
    const content = mergeGeneratedTypes(outputPath, typesCode);
    writeFileSync(outputPath, content);
  } else {
    writeFileSync(outputPath, typesCode);
  }

  console.log(`Types ${typesConfig.merge ? 'merged' : 'generated'}: ${outputPath}`);
}

async function generateDocuments(typesDir, codegenConfig, typesConfig) {
  const graphqlPattern = codegenConfig.documents ?? 'src/**/*.graphql';
  const files = findGraphqlFiles(graphqlPattern);

  if (files.length === 0) {
    console.log('No .graphql files found matching pattern:', graphqlPattern);
    return 0;
  }

  const operations = files
    .map((f) => parseGraphqlFile(f))
    .filter((op) => op !== null);

  if (operations.length === 0) return 0;

  // ── Fragment types from .graphql files ──
  const fragments = files
    .map((f) => parseFragmentFile(f))
    .filter((f) => f !== null)
    .flat();

  // Build fragment type map for document result type generation
  const fragmentTypeMap = new Map();
  const fragsDir = resolve(typesDir, 'fragments');
  if (fragments.length > 0) {
    if (!existsSync(fragsDir)) mkdirSync(fragsDir, { recursive: true });

    const typesPath = resolve(typesDir, 'index.ts');
    const typesCode = existsSync(typesPath) ? readFileSync(typesPath, 'utf-8') : undefined;

    for (const frag of fragments) {
      const code = generateFragmentCode([frag], typesCode, clientPreset);
      writeFileSync(join(fragsDir, `${frag.name}.ts`), code);

      // Build fragment type info map for document generation
      const keyName = `${frag.name}Fragment$key`;
      const relPath = `../fragments/${frag.name}`;
      fragmentTypeMap.set(frag.name, {
        name: frag.name,
        keyName,
        typeCondition: frag.typeCondition,
        importRelative: relPath,
      });

      console.log(`  Fragment: ${frag.name}.ts`);
    }

    writeFileSync(join(fragsDir, 'index.ts'), generateFragmentIndex(fragments));
    console.log(`Generated ${fragments.length} fragment type(s) in ${fragsDir}`);
  }

  // ── Typed documents ──
  const docsDir = resolve(typesDir, 'documents');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });

  const typesPath = resolve(typesDir, 'index.ts');
  const typesCode = existsSync(typesPath) ? readFileSync(typesPath, 'utf-8') : undefined;

  const clientPreset = opts.clientPreset === true;

  for (const op of operations) {
    const code = generateTypedDocumentsCode([op], typesCode, { clientPreset }, fragmentTypeMap.size > 0 ? fragmentTypeMap : undefined);
    writeFileSync(join(docsDir, `${op.name}.ts`), code);
    console.log(`  Generated: ${op.name}.ts`);
  }

  const index = generateIndexCode(operations);
  writeFileSync(join(docsDir, 'index.ts'), index);
  console.log(`Generated ${operations.length} typed document(s) in ${docsDir}`);

  return operations.length + fragments.length;
}

async function generateAll(codegenConfig, typesConfig, schemaFile, typesDir, opts) {
  const result = { typesGenerated: false, documentsGenerated: false, documentCount: 0 };

  if (!opts.documentsOnly) {
    await generateSchemaTypesFromFile(schemaFile, typesDir, typesConfig, opts);
    result.typesGenerated = true;
  }

  if (!opts.schemaOnly) {
    const count = await generateDocuments(typesDir, codegenConfig, typesConfig);
    result.documentsGenerated = true;
    result.documentCount = count;
  }

  return result;
}

// ── Watch mode ──

function debounce(fn, ms) {
  let timer = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

/**
 * Watches directories containing .graphql files for changes.
 * Polls every 2s to detect new directories/files matching the glob pattern.
 */
class GraphqlWatcher {
  #watchedDirs = new Set();
  #watchers = [];
  #pollTimer = null;
  #pattern;
  #onChanged;
  #onNewFiles;

  constructor(pattern, onChanged, onNewFiles) {
    this.#pattern = pattern;
    this.#onChanged = onChanged;
    this.#onNewFiles = onNewFiles;
  }

  start() {
    this.#updateWatchedDirs();
    this.#pollTimer = setInterval(() => this.#updateWatchedDirs(), 2000);
  }

  stop() {
    for (const w of this.#watchers) w.close();
    this.#watchers = [];
    this.#watchedDirs.clear();
    if (this.#pollTimer) clearInterval(this.#pollTimer);
  }

  #updateWatchedDirs() {
    const files = findGraphqlFiles(this.#pattern);
    const dirs = new Set(files.map((f) => dirname(f)));

    let hasNew = false;
    for (const d of dirs) {
      if (!this.#watchedDirs.has(d)) {
        this.#watchedDirs.add(d);
        this.#startWatchingDir(d);
        hasNew = true;
      }
    }

    if (hasNew) {
      setTimeout(() => this.#onNewFiles(), 500);
    }
  }

  #startWatchingDir(dir) {
    try {
      const w = watch(dir, (eventType, filename) => {
        if (!filename || !filename.endsWith('.graphql')) return;
        this.#onChanged();
      });
      this.#watchers.push(w);
    } catch {
      // directory may have been deleted between glob and watch
    }
  }
}

async function runWatch(codegenConfig, typesConfig, schemaConfig, typesDir, opts) {
  const schemaDir = resolve(cwd, schemaConfig.dir ?? './schema');
  const schemaFile = resolve(schemaDir, schemaConfig.filename ?? 'schema.json');

  const graphqlPattern = codegenConfig.documents ?? 'src/**/*.graphql';
  let cache = { schema: '' };

  const doGenerate = debounce(async () => {
    const needsSchema = !opts.documentsOnly;
    const needsDocs = !opts.schemaOnly;

    let schemaChanged = false;

    if (needsSchema) {
      const content = existsSync(schemaFile) ? readFileSync(schemaFile, 'utf-8') : '';
      if (content !== cache.schema) {
        cache = { schema: content };
        schemaChanged = true;
        try {
          await generateSchemaTypesFromFile(schemaFile, typesDir, typesConfig, opts);
        } catch (err) {
          console.error(`Schema generation failed: ${err.message}`);
        }
      }
    }

    if (needsDocs && (schemaChanged || needsSchema === false)) {
      try {
        await generateDocuments(typesDir, codegenConfig, typesConfig);
      } catch (err) {
        console.error(`Document generation failed: ${err.message}`);
      }
    }
  }, 300);

  const initialResult = await generateAll(codegenConfig, typesConfig, schemaFile, typesDir, opts);
  cache.schema = existsSync(schemaFile) ? readFileSync(schemaFile, 'utf-8') : '';

  // Watch schema file
  if (!opts.documentsOnly && existsSync(schemaFile)) {
    try {
      watch(schemaFile, () => {
        console.log('Schema changed, regenerating...');
        doGenerate();
      });
    } catch {
      // fallback: schema not watchable
    }
  }

  // Watch .graphql files
  if (!opts.schemaOnly) {
    const watcher = new GraphqlWatcher(
      graphqlPattern,
      () => {
        console.log('GraphQL file changed, regenerating documents...');
        doGenerate();
      },
      () => {
        console.log('New .graphql files detected, regenerating...');
        doGenerate();
      },
    );
    watcher.start();

    console.log(`Watching for changes...`);

    // Keep process alive
    await new Promise(() => {});
  }
}

async function run() {
  const opts = parseArgs(args);
  const config = await loadConfig(cwd, opts.configPath);
  const codegenConfig = config.codegen ?? config;
  const typesConfig = codegenConfig.types ?? {};
  const schemaConfig = codegenConfig.schema ?? {};
  const schemaDir = resolve(cwd, schemaConfig.dir ?? './schema');
  const typesDir = resolve(cwd, opts.output ?? typesConfig.dir ?? './graphql/types');
  const schemaFile = resolve(schemaDir, schemaConfig.filename ?? 'schema.json');

  if (opts.watch) {
    await runWatch(codegenConfig, typesConfig, schemaConfig, typesDir, opts);
  } else {
    await generateAll(codegenConfig, typesConfig, schemaFile, typesDir, opts);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
