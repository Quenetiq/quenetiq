import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql';

export interface DownloaderOptions {
	endpoint: string;
	outputDir: string;
	filename?: string;
	headers?: Record<string, string>;
}

export async function downloadAndStoreSchema(
	options: DownloaderOptions,
): Promise<{ sdlPath: string; jsonPath: string }> {
	const introspectionQuery = getIntrospectionQuery({ descriptions: true });
	const response = await fetch(options.endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		body: JSON.stringify({ query: introspectionQuery }),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
	}

	const body = (await response.json()) as {
		data: Record<string, unknown>;
		errors?: { message: string }[];
	};
	if (body.errors && body.errors.length > 0) {
		throw new Error(`Introspection errors: ${body.errors.map((e) => e.message).join(', ')}`);
	}

	const schema = buildClientSchema(body.data as never);
	const sdl = printSchema(schema);
	const json = JSON.stringify(body.data, null, 2);

	const filename = options.filename || 'schema.json';
	const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
	const sdlFilename = `${baseName}.graphql`;

	mkdirSync(options.outputDir, { recursive: true });

	const sdlPath = resolve(options.outputDir, sdlFilename);
	const jsonPath = resolve(options.outputDir, filename);

	writeFileSync(sdlPath, sdl, 'utf-8');
	writeFileSync(jsonPath, json, 'utf-8');

	return { sdlPath, jsonPath };
}
