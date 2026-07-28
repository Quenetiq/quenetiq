#!/usr/bin/env node
import { resolve } from 'node:path';
import { loadConfig } from './load-config.mjs';
import { downloadAndStoreSchema } from '../projects/quenetiq/downloader/src/public-api.ts';

const args = process.argv.slice(2);

function getArg(name, fallback) {
	const val = args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
		?? args.find((a) => a.startsWith(`--${name} `))?.split(' ')[1];
	return val ?? fallback;
}

function hasFlag(name) {
	return args.includes(`--${name}`);
}

const helpFlag = hasFlag('help') || hasFlag('h');

if (helpFlag) {
	console.log(`
Usage: node tools/download-schema.mjs [options]

Options:
  --endpoint=<url>   GraphQL endpoint URL (default: from config)
  --output=<dir>     Output directory for schema files (default: from config)
  --filename=<name>  Custom filename for downloaded schema (default: schema.json)
  --help, -h         Show this help
`);
	process.exit(0);
}

let config;
try {
	const loaded = await loadConfig(process.cwd());
	config = loaded.config;
} catch {
	config = {};
}

const codegen = config.codegen ?? config;
const defaultEndpoint = codegen.schema?.endpoint ?? 'http://localhost:8080/graphql';
const defaultOutput = codegen.schema?.dir ?? './public/schema';
const defaultFilename = codegen.schema?.filename ?? 'schema.json';
const defaultHeaders = codegen.schema?.headers ?? {};

const endpoint = getArg('endpoint', defaultEndpoint);
const outputDir = getArg('output', defaultOutput);
const filename = getArg('filename', defaultFilename);

console.log(`\n  endpoint  ${endpoint}`);
console.log(`  output    ${resolve(outputDir)}`);
console.log(`  filename  ${filename}\n`);

try {
	const result = await downloadAndStoreSchema({
		endpoint,
		outputDir,
		filename,
		headers: defaultHeaders,
	});

	console.log('  Written:\n');
	console.log(`    ${result.sdlPath}`);
	console.log(`    ${result.jsonPath}`);
	console.log('\n  Done.\n');
} catch (err) {
	console.error(`  Error downloading schema: ${err.message}`);
	process.exit(1);
}
