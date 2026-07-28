#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startDevServer } from '@dumbql/dev-server';

const args = process.argv.slice(2);
const flags = {};

for (let i = 0; i < args.length; i++) {
	if (args[i].startsWith('--')) {
		const key = args[i].slice(2);
		const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
		flags[key] = val;
		if (val !== 'true') i++;
	}
}

const configPath = flags.config
	? resolve(flags.config)
	: resolve('dumbql.config.json');

let config = {};

if (existsSync(configPath)) {
	try {
		config = JSON.parse(readFileSync(configPath, 'utf-8'));
	} catch {
		// ignore
	}
}

const mockResolversPath = flags.resolvers
	? resolve(flags.resolvers)
	: resolve('mock/resolvers.js');

let mockResolvers;

if (existsSync(mockResolversPath)) {
	try {
		mockResolvers = (await import(mockResolversPath)).default;
	} catch {
		// ignore
	}
}

const port = flags.port ? Number(flags.port) : 4000;

const spawn = config.spawn
	? { cmd: config.spawn.cmd, cwd: config.spawn.cwd }
	: undefined;

if (flags.spawn) {
	spawn = spawn || {};
	spawn.cmd = flags.spawn;
}

const staticDir = flags.static ?? config.staticDir;

await startDevServer({
	port,
	mock: {
		schema: flags.schema || (config.mock?.schema),
		resolvers: mockResolvers,
	},
	proxy: {
		target: flags.proxy ?? config.proxy?.target ?? 'http://localhost:4200',
		rewrite: flags.rewrite !== undefined
			? flags.rewrite !== 'false'
			: config.proxy?.rewrite,
	},
	spawn,
	staticDir: staticDir || undefined,
});
