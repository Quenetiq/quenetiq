import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
	'Access-Control-Max-Age': '86400',
	'Access-Control-Allow-Private-Network': 'true',
};

interface MockEntity {
	id: string;
	title?: string;
	content?: string;
	completed?: boolean;
	name?: string;
	email?: string;
	avatar?: string;
	createdAt?: string;
}

interface MockData {
	notes: MockEntity[];
	todos: MockEntity[];
	users: MockEntity[];
}

const MOCK_DATA: MockData = {
	notes: [
		{
			id: '1',
			title: 'Welcome to Quenetiq',
			content: 'This is your first note. Try editing or deleting it!',
			createdAt: new Date().toISOString(),
		},
		{
			id: '2',
			title: 'Getting Started',
			content: 'Install @quenetiq/client and create a client with createClient().',
			createdAt: new Date().toISOString(),
		},
		{
			id: '3',
			title: 'Pro Tip',
			content: 'Use the cache middleware for automatic normalized caching.',
			createdAt: new Date().toISOString(),
		},
	],
	todos: [
		{ id: '1', title: 'Set up the project', completed: true },
		{ id: '2', title: 'Write your first query', completed: false },
		{ id: '3', title: 'Add mutations', completed: false },
		{ id: '4', title: 'Enable subscriptions', completed: false },
	],
	users: [
		{
			id: '1',
			name: 'Alice',
			email: 'alice@example.com',
			avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
		},
		{
			id: '2',
			name: 'Bob',
			email: 'bob@example.com',
			avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
		},
		{
			id: '3',
			name: 'Charlie',
			email: 'charlie@example.com',
			avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
		},
	],
};

function parseBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
		req.on('error', reject);
	});
}

function generateId(): string {
	return String(Date.now()) + String(Math.random()).slice(2, 8);
}

function extractField(query: string, fieldName: string): boolean {
	const regex = new RegExp(`\\b${fieldName}\\b`);
	return regex.test(query);
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return '';
}

function getBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') return value === 'true';
	return false;
}

function findEntity(entities: MockEntity[], id: string): MockEntity | undefined {
	return entities.find((e) => e.id === id);
}

type GraphQLResponse = { data: unknown } | { errors: { message: string }[] };

function executeQuery(query: string, variables: Record<string, unknown>): GraphQLResponse {
	const lowerQuery = query.toLowerCase();

	if (extractField(query, 'notes')) {
		return { data: { notes: MOCK_DATA.notes } };
	}

	if (extractField(query, 'note')) {
		const id = getString(variables.id);
		const note = findEntity(MOCK_DATA.notes, id);
		return { data: { note: note ?? null } };
	}

	if (extractField(query, 'todos')) {
		return { data: { todos: MOCK_DATA.todos } };
	}

	if (extractField(query, 'todo')) {
		const id = getString(variables.id);
		const todo = findEntity(MOCK_DATA.todos, id);
		return { data: { todo: todo ?? null } };
	}

	if (extractField(query, 'users')) {
		return { data: { users: MOCK_DATA.users } };
	}

	if (extractField(query, 'user')) {
		const id = getString(variables.id);
		const user = findEntity(MOCK_DATA.users, id);
		return { data: { user: user ?? null } };
	}

	if (lowerQuery.includes('mutation')) {
		return executeMutation(query, variables);
	}

	return { data: null };
}

function executeMutation(query: string, variables: Record<string, unknown>): GraphQLResponse {
	if (extractField(query, 'addNote')) {
		const note: MockEntity = {
			id: generateId(),
			title: getString(variables.title),
			content: getString(variables.content),
			createdAt: new Date().toISOString(),
		};
		MOCK_DATA.notes.push(note);
		return { data: { addNote: note } };
	}

	if (extractField(query, 'updateNote')) {
		const id = getString(variables.id);
		const note = findEntity(MOCK_DATA.notes, id);
		if (!note) {
			return { errors: [{ message: `Note ${id} not found` }] };
		}
		if (variables.title) note.title = getString(variables.title);
		if (variables.content) note.content = getString(variables.content);
		return { data: { updateNote: note } };
	}

	if (extractField(query, 'deleteNote')) {
		const id = getString(variables.id);
		const index = MOCK_DATA.notes.findIndex((n) => n.id === id);
		if (index === -1) {
			return { errors: [{ message: `Note ${id} not found` }] };
		}
		MOCK_DATA.notes.splice(index, 1);
		return { data: { deleteNote: true } };
	}

	if (extractField(query, 'addTodo')) {
		const todo: MockEntity = {
			id: generateId(),
			title: getString(variables.title),
			completed: false,
		};
		MOCK_DATA.todos.push(todo);
		return { data: { addTodo: todo } };
	}

	if (extractField(query, 'toggleTodo')) {
		const id = getString(variables.id);
		const todo = findEntity(MOCK_DATA.todos, id);
		if (!todo) {
			return { errors: [{ message: `Todo ${id} not found` }] };
		}
		todo.completed = !getBoolean(todo.completed);
		return { data: { toggleTodo: todo } };
	}

	return { data: null };
}

function handleCors(res: ServerResponse): void {
	res.writeHead(204, CORS_HEADERS);
	res.end();
}

function serveStatic(req: IncomingMessage, res: ServerResponse, staticDir: string): void {
	let pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
	if (pathname === '/') pathname = '/index.html';
	const filePath = join(staticDir, pathname);

	if (!existsSync(filePath) || !statSync(filePath).isFile()) {
		res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
		res.end('Not Found');
		return;
	}

	const ext = extname(filePath);
	const MIME_TYPES: Record<string, string> = {
		'.html': 'text/html; charset=utf-8',
		'.js': 'text/javascript; charset=utf-8',
		'.css': 'text/css; charset=utf-8',
		'.json': 'application/json',
	};

	res.writeHead(200, {
		'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
		...CORS_HEADERS,
	});
	res.end(readFileSync(filePath));
}

export interface MockServerConfig {
	port?: number;
	staticDir?: string;
	schema?: string;
}

/**
 * Creates a mock GraphQL server for development and testing.
 *
 * @example
 * ```typescript
 * import { createMockServer } from '@quenetiq/testing';
 *
 * const server = createMockServer({ port: 4000 });
 * server.listen(4000, () => {
 *   console.log('Mock server running at http://localhost:4000/graphql');
 * });
 * ```
 */
export function createMockServer(config: MockServerConfig = {}): Server {
	const staticDir = config.staticDir;

	return createServer(async (req: IncomingMessage, res: ServerResponse) => {
		const url = new URL(req.url ?? '/', 'http://localhost');

		if (req.method === 'OPTIONS') {
			handleCors(res);
			return;
		}

		if (url.pathname === '/graphql') {
			try {
				const body = await parseBody(req);
				const parsed = JSON.parse(body) as unknown;

				if (!isNonNullObject(parsed)) {
					res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
					res.end(JSON.stringify({ errors: [{ message: 'Invalid request body' }] }));
					return;
				}

				const query = getString(parsed.query);
				const variables = isNonNullObject(parsed.variables) ? parsed.variables : {};

				const result = executeQuery(query, variables);
				res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
				res.end(JSON.stringify(result));
			} catch {
				res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
				res.end(JSON.stringify({ errors: [{ message: 'Invalid request' }] }));
			}
			return;
		}

		if (staticDir) {
			serveStatic(req, res, staticDir);
			return;
		}

		res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
		res.end('Not Found');
	});
}

/**
 * Starts the mock GraphQL server and returns a promise that resolves when ready.
 *
 * @example
 * ```typescript
 * import { startMockServer } from '@quenetiq/testing';
 *
 * const server = await startMockServer({ port: 4000 });
 * console.log('Mock server running at http://localhost:4000/graphql');
 *
 * // Later...
 * server.close();
 * ```
 */
export function startMockServer(config: MockServerConfig = {}): Promise<Server> {
	const port = config.port ?? 4000;
	const server = createMockServer(config);

	return new Promise((resolve) => {
		server.listen(port, () => {
			// eslint-disable-next-line no-console
			console.log(`Mock GraphQL server running at http://localhost:${port}/graphql`);
			resolve(server);
		});
	});
}
