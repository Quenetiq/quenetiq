import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { resolve, join, extname, dirname } from 'node:path';
import { spawn as spawnChild } from 'node:child_process';
import { createYoga, createSchema } from 'graphql-yoga';
import type { GraphQLSchema } from 'graphql';
import { WebSocketServer } from 'ws';
import type { DevServerConfig } from './types.js';
import { analyzeEnvironment, resolvePublicFrontendHost, type EnvInfo } from './env-analyzer.js';

function isInlineSchema(s: string): boolean {
	return /^\s*(type|schema|enum|input|interface|scalar|union|extend|directive)\b/.test(s);
}

function loadSchema(config: DevServerConfig['mock']): GraphQLSchema {
	let typeDefs = '';

	if (config?.schema) {
		if (isInlineSchema(config.schema)) {
			typeDefs = config.schema;
		} else {
			const schemaPath = resolve(config.schema);
			if (existsSync(schemaPath)) {
				typeDefs = readFileSync(schemaPath, 'utf-8');
			} else {
				typeDefs = 'type Query { ping: String } type Mutation { pong: String }';
			}
		}
	} else {
		const schemaPath = resolve('graphql/schema.graphql');
		if (existsSync(schemaPath)) {
			typeDefs = readFileSync(schemaPath, 'utf-8');
		} else {
			typeDefs = 'type Query { ping: String } type Mutation { pong: String }';
		}
	}

	if (config?.resolvers) {
		return createSchema({ typeDefs, resolvers: config.resolvers }) as GraphQLSchema;
	}

	return createSchema({ typeDefs }) as GraphQLSchema;
}

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
	'Access-Control-Max-Age': '86400',
	'Access-Control-Allow-Private-Network': 'true',
};

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.map': 'application/json',
};

function serveStatic(req: IncomingMessage, res: ServerResponse, staticDir: string): void {
	let pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
	if (pathname === '/') pathname = '/index.html';
	const filePath = join(staticDir, pathname);
	try {
		if (!existsSync(filePath) || !statSync(filePath).isFile()) {
			res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
			res.end('Not Found');
			return;
		}
		const ext = extname(filePath);
		res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream', ...CORS_HEADERS });
		res.end(readFileSync(filePath));
	} catch {
		res.writeHead(500, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
		res.end('Internal Server Error');
	}
}

function handleCors(res: ServerResponse): boolean {
	res.writeHead(204, CORS_HEADERS);
	res.end();
	return true;
}

const LOADING_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Starting up...</title>
  <meta http-equiv="refresh" content="3">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #1a1a2e; color: #e0e0e0; }
    .loader { width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #6366f1; border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .container { text-align: center; }
    p { font-size: 18px; color: #a0a0b0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="loader"></div>
    <p>Starting frontend dev server...</p>
  </div>
</body>
</html>`;

function isMeaningfulHtml(html: string): boolean {
	const meaningfulIndicators = [
		'<app-root',
		'id="root"',
		'id="app"',
		'id="__next"',
		'<div id="',
		'<router-outlet',
		'<ng-component',
	];
	return html.length > 200 && meaningfulIndicators.some((ind) => html.includes(ind));
}

function createProxyHandler(frontendTarget: string, env: EnvInfo, devServerPort: number) {
	const needsRewrite = env.needsUrlRewrite;

	return (req: IncomingMessage, res: ServerResponse) => {
		if (req.method === 'OPTIONS') {
			handleCors(res);
			return;
		}

		const url = new URL(req.url ?? '/', frontendTarget);
		const isHttps = frontendTarget.startsWith('https');
		const requester = isHttps ? httpsRequest : httpRequest;

		const headers: Record<string, string> = {};
		for (const [k, v] of Object.entries(req.headers)) {
			headers[k] = Array.isArray(v) ? (v as string[]).join(', ') : (v as string);
		}
		Object.assign(headers, CORS_HEADERS);
		delete headers['host'];

		const options = {
			hostname: url.hostname,
			port: url.port || (isHttps ? 443 : 80),
			path: url.pathname + url.search,
			method: req.method,
			headers,
		};

		const proxyReq = requester(options, (proxyRes: IncomingMessage) => {
			const flatHeaders: Record<string, string> = {};
			for (const [k, v] of Object.entries(proxyRes.headers)) {
				flatHeaders[k] = Array.isArray(v) ? (v as string[]).join(', ') : (v as string);
			}
			const combinedHeaders: Record<string, string> = { ...flatHeaders, ...CORS_HEADERS };

			const contentType = combinedHeaders['content-type'] ?? '';
			const shouldBuffer = needsRewrite
				? contentType.startsWith('text/html') ||
					contentType.startsWith('text/javascript') ||
					contentType.startsWith('application/javascript') ||
					contentType.startsWith('text/css')
				: contentType.startsWith('text/html');

			if (shouldBuffer) {
				const chunks: Buffer[] = [];
				proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
				proxyRes.on('end', () => {
					let body = Buffer.concat(chunks).toString('utf-8');

					if (contentType.startsWith('text/html') && !isMeaningfulHtml(body)) {
						res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS });
						res.end(LOADING_PAGE);
						return;
					}

					if (needsRewrite) {
						const hostHeader = req.headers['host'];
						let publicHost: string | null = null;
						if (hostHeader) {
							const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
							const frontendPort = Number(new URL(frontendTarget).port) || 4200;
							publicHost = resolvePublicFrontendHost(host, frontendPort, devServerPort);
						}
						if (publicHost) {
							const targetOrigin = frontendTarget.replace(/\/$/, '');
							body = body.replace(
								new RegExp(targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
								`https://${publicHost}`,
							);
						}
					}

					res.writeHead(proxyRes.statusCode ?? 200, combinedHeaders);
					res.end(body);
				});
				return;
			}

			res.writeHead(proxyRes.statusCode ?? 200, combinedHeaders);
			proxyRes.pipe(res, { end: true });
		});

		proxyReq.on('error', () => {
			if (!res.headersSent) {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS });
				res.end(LOADING_PAGE);
			}
		});

		req.pipe(proxyReq, { end: true });
	};
}

interface SchemaWatchState {
	yoga: ReturnType<typeof createYoga>;
	schema: GraphQLSchema;
}

function createFreshYoga(schema: GraphQLSchema): ReturnType<typeof createYoga> {
	return createYoga({
		schema,
		graphqlEndpoint: '/graphql',
		cors: {
			origin: '*',
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
		},
	});
}

function resolveSchemaPath(config: DevServerConfig): string | null {
	const mock = config.mock;
	if (mock?.schema && !isInlineSchema(mock.schema)) {
		return resolve(mock.schema);
	}
	const defaultPath = resolve('graphql/schema.graphql');
	if (existsSync(defaultPath)) {
		return defaultPath;
	}
	return null;
}

function attachSchemaWatcher(config: DevServerConfig, state: SchemaWatchState, server: Server): void {
	if (!config.mock?.watchSchema) return;

	const schemaPath = resolveSchemaPath(config);
	if (!schemaPath) {
		console.warn('  [schema-watch] No schema file found to watch');
		return;
	}

	const wss = new WebSocketServer({ server, path: '/schema-ws' });
	console.log(`  Schema WebSocket: /schema-ws (watching ${schemaPath})`);

	const broadcast = (event: string, data: unknown) => {
		const msg = JSON.stringify({ type: event, data });
		wss.clients.forEach((client) => {
			if (client.readyState === 1) client.send(msg);
		});
	};

	watch(dirname(schemaPath), (eventType, filename) => {
		if (filename && eventType === 'change') {
			try {
				state.schema = loadSchema(config.mock);
				state.yoga = createFreshYoga(state.schema);
				const sdl = readFileSync(schemaPath, 'utf-8');
				broadcast('schema-changed', { sdl, timestamp: Date.now() });
				console.log(`  [schema-watch] Schema reloaded: ${filename}`);
			} catch (err) {
				broadcast('schema-error', { message: String(err), timestamp: Date.now() });
				console.error('  [schema-watch] Failed to reload schema:', err);
			}
		}
	});
}

export function createDevServer(config: DevServerConfig & { port?: number } = {}): Server {
	const frontendTarget = config.proxy?.target ?? 'http://localhost:4200';
	const env = analyzeEnvironment(config.proxy?.rewrite);
	const port = config.port ?? 4000;
	const staticDir = config.staticDir;

	const state: SchemaWatchState = {
		schema: loadSchema(config.mock),
		yoga: null as unknown as ReturnType<typeof createYoga>,
	};
	state.yoga = createFreshYoga(state.schema);

	const proxy = createProxyHandler(frontendTarget, env, port);

	const server = createServer((req: IncomingMessage, res: ServerResponse) => {
		const url = new URL(req.url ?? '/', 'http://localhost');

		if (req.method === 'OPTIONS') {
			handleCors(res);
			return;
		}

		if (url.pathname === '/graphql') {
			state.yoga(req, res);
			return;
		}

		if (staticDir) {
			const resolvedStatic = resolve(staticDir);
			const indexHtml = ['index.html', 'browser/index.html'].find((p) => existsSync(join(resolvedStatic, p)));
			if (indexHtml) {
				serveStatic(req, res, resolvedStatic);
			} else {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS });
				res.end(LOADING_PAGE);
			}
			return;
		}

		proxy(req, res);
	});

	attachSchemaWatcher(config, state, server);

	return server;
}

function waitForTarget(url: string, timeout = 300_000, interval = 1_000): Promise<void> {
	return new Promise((resolve, reject) => {
		const start = Date.now();
		const isHttps = url.startsWith('https');
		const requester = isHttps ? httpsRequest : httpRequest;
		const parsed = new URL(url);

		function poll() {
			const req = requester(
				{
					hostname: parsed.hostname,
					port: parsed.port || (isHttps ? 443 : 80),
					path: '/',
					method: 'HEAD',
					timeout: 10_000,
				},
				(res) => {
					res.resume();
					resolve();
				},
			);

			req.on('error', () => {
				if (Date.now() - start > timeout) {
					reject(new Error(`Timeout waiting for ${url}`));
					return;
				}
				setTimeout(poll, interval);
			});

			req.on('timeout', () => {
				req.destroy();
				if (Date.now() - start > timeout) {
					reject(new Error(`Timeout waiting for ${url}`));
					return;
				}
				setTimeout(poll, interval);
			});

			req.end();
		}

		poll();
	});
}

export async function startDevServer(config: DevServerConfig & { port?: number }): Promise<Server> {
	const port = config.port ?? 4000;
	const frontend = config.proxy?.target ?? 'http://localhost:4200';
	const env = analyzeEnvironment();
	const server = createDevServer({ ...config, port });

	if (env.runtime !== 'local') {
		console.log(`  Environment: ${env.runtime} (URL rewrite enabled)`);
	}

	if (config.spawn) {
		const [cmd, ...args] = config.spawn.cmd.split(/\s+/);
		const child = spawnChild(cmd, args, {
			cwd: config.spawn.cwd,
			stdio: ['ignore', 'inherit', 'inherit'],
		});
		child.on('exit', (code) => {
			if (code && code > 0) {
				console.warn(`  Spawned process exited with code ${code}`);
			}
		});
		console.log(`  Spawning: ${config.spawn.cmd}`);
	}

	waitForTarget(frontend)
		.then(() => {
			console.log(`  Frontend ready: ${frontend}`);
		})
		.catch(() => {
			console.warn(`  Frontend at ${frontend} never responded`);
		});

	return new Promise((resolve) => {
		server.listen(port, () => {
			console.log(`Quenetiq Dev Server running at http://localhost:${port}`);
			console.log(`  GraphQL:   http://localhost:${port}/graphql`);
			console.log(`  Frontend:  ${frontend}`);
			resolve(server);
		});
	});
}
