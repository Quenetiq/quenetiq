import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { buildSchema, getOperationAST, graphql, parse, subscribe } from 'graphql';
import { WebSocket, WebSocketServer } from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(join(__dirname, '..', 'graphql', 'schema.graphql'), 'utf-8');
const schema = buildSchema(typeDefs);

const allowedOrigin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:4200';

const users = [
  { id: '550e8400-e29b-41d4-a716-446655440000', username: 'demo', password: 'demo123', masterKey: '', createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-06-01T12:00:00Z' },
  { id: '550e8400-e29b-41d4-a716-446655440001', username: 'admin', password: 'admin123', masterKey: 'mk-admin', createdAt: '2026-02-20T08:30:00Z', updatedAt: '2026-06-15T14:00:00Z' },
];

const notes = [
  { id: '660e8400-e29b-41d4-a716-446655440010', title: 'Welcome', content: 'Welcome to Quenetiq Keystore!', description: 'Getting started guide', iconUrl: null, noteType: 'NOTE', createdAt: '2026-06-01T10:00:00Z', updatedAt: null, author: users[0] },
  { id: '660e8400-e29b-41d4-a716-446655440011', title: 'GraphQL Basics', content: 'GraphQL is a query language for APIs.', description: 'Learn the fundamentals', iconUrl: null, noteType: 'NOTE', createdAt: '2026-06-02T11:00:00Z', updatedAt: '2026-06-10T09:00:00Z', author: users[0] },
  { id: '660e8400-e29b-41d4-a716-446655440012', title: 'API Keys', content: 'Production API key: sk-...', description: 'Sensitive credentials', iconUrl: null, noteType: 'PASSWORD', createdAt: '2026-06-05T15:00:00Z', updatedAt: null, author: users[1] },
];

class PubSub {
  constructor() {
    this.emitter = new EventEmitter();
  }

  publish(topic, payload) {
    this.emitter.emit(topic, payload);
  }

  subscribe(topic) {
    const queue = [];
    const resolvers = [];
    const push = (value) => {
      if (resolvers.length > 0) resolvers.shift()({ value, done: false });
      else queue.push(value);
    };
    const remove = () => this.emitter.removeListener(topic, push);
    this.emitter.on(topic, push);
    return {
      [Symbol.asyncIterator]() { return this; },
      next: () => {
        if (queue.length > 0) return Promise.resolve({ value: queue.shift(), done: false });
        return new Promise((resolve) => resolvers.push(resolve));
      },
      return: () => {
        remove();
        if (resolvers.length > 0) resolvers.shift()({ value: undefined, done: true });
        return Promise.resolve({ value: undefined, done: true });
      },
      throw: (err) => { remove(); return Promise.reject(err); },
    };
  }
}

const pubsub = new PubSub();

const root = {
  getCurrentUser: () => users[0],
  getNotes: ({ filter }) => {
    if (!filter) return notes;
    return notes.filter((n) => n.noteType === filter);
  },
  getNoteDetails: ({ id }) => {
    const note = notes.find((n) => n.id === id);
    if (!note) throw new Error(`Note ${id} not found`);
    return note;
  },
  createUser: ({ input }) => {
    const newUser = { id: crypto.randomUUID(), ...input, masterKey: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    users.push(newUser);
    return newUser;
  },
  updateUser: ({ input }) => ({ ...users[0], ...input, updatedAt: new Date().toISOString() }),
  deleteUser: () => true,
  setMasterKey: ({ masterKey }) => ({ ...users[0], masterKey, updatedAt: new Date().toISOString() }),
  createNote: ({ input }) => {
    const newNote = { id: crypto.randomUUID(), ...input, iconUrl: null, createdAt: new Date().toISOString(), updatedAt: null, author: users[0] };
    notes.push(newNote);
    pubsub.publish('noteAdded', newNote);
    return newNote;
  },
  updateNote: ({ input }) => {
    const updatedNote = { ...notes[0], ...input, updatedAt: new Date().toISOString() };
    pubsub.publish('noteUpdated', updatedNote);
    return updatedNote;
  },
  deleteNote: () => true,
};

const subscriptionRoot = {
  noteAdded: { subscribe: () => pubsub.subscribe('noteAdded') },
  noteUpdated: { subscribe: () => pubsub.subscribe('noteUpdated') },
};

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

function isAsyncIterable(value) {
  return value != null && typeof value[Symbol.asyncIterator] === 'function';
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url !== '/graphql') { res.writeHead(404); res.end('Not found'); return; }

  const body = JSON.parse(await readBody(req));
  const result = await graphql({ schema, source: body.query, variableValues: body.variables, rootValue: root });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

const wss = new WebSocketServer({ server, path: '/graphql' });

wss.on('connection', (ws) => {
  const subscriptions = new Map();

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (typeof msg !== 'object' || msg === null) return;

    switch (msg.type) {
    case 'connection_init':
      send(ws, { type: 'connection_ack' });
      break;

    case 'subscribe': {
      const { id, payload } = msg;
      if (!id || !payload?.query) break;
      try {
        const document = parse(payload.query);
        const operationAST = getOperationAST(document, payload.operationName);
        const operation = operationAST?.operation ?? 'query';

        if (operation === 'subscription') {
          const result = await subscribe({
            schema,
            document,
            variableValues: payload.variables,
            operationName: payload.operationName,
            rootValue: subscriptionRoot,
            subscribeFieldResolver: (rootValue, args, context, info) => {
              const resolver = rootValue?.[info.fieldName];
              return typeof resolver?.subscribe === 'function' ? resolver.subscribe(args, context, info) : resolver;
            },
            fieldResolver: (source, args, context, info) => {
              if (info.path.typename === 'Subscription') return source;
              const property = source?.[info.fieldName];
              return typeof property === 'function' ? property(args, context, info) : property;
            },
          });

          if (isAsyncIterable(result)) {
            subscriptions.set(id, result);
            (async () => {
              try {
                for await (const execResult of result) {
                  if (ws.readyState !== WebSocket.OPEN) break;
                  send(ws, { type: 'next', id, payload: execResult });
                }
                if (ws.readyState === WebSocket.OPEN) {
                  send(ws, { type: 'complete', id });
                }
              } catch (err) {
                send(ws, { type: 'error', id, payload: { message: err instanceof Error ? err.message : String(err) } });
              } finally {
                subscriptions.delete(id);
              }
            })();
          } else {
            send(ws, { type: 'next', id, payload: result });
            send(ws, { type: 'complete', id });
          }
        } else {
          const result = await graphql({
            schema,
            source: payload.query,
            variableValues: payload.variables,
            operationName: payload.operationName,
            rootValue: root,
          });
          send(ws, { type: 'next', id, payload: result });
          send(ws, { type: 'complete', id });
        }
      } catch (err) {
        send(ws, { type: 'error', id, payload: { message: err instanceof Error ? err.message : String(err) } });
      }
      break;
    }

    case 'complete':
      subscriptions.get(msg.id)?.return?.();
      subscriptions.delete(msg.id);
      break;

    case 'ping':
      send(ws, { type: 'pong' });
      break;

    case 'connection_terminate':
      ws.close();
      break;
    }
  });

  ws.on('close', () => {
    for (const iterator of subscriptions.values()) {
      iterator.return?.().catch(() => {});
    }
    subscriptions.clear();
  });
});

const port = 4000;
server.listen(port, () => {
  console.log(`Mock GraphQL server running at http://localhost:${port}/graphql`);
  console.log(`  subscriptions: ws://localhost:${port}/graphql`);
  console.log(`  CORS allow-origin: ${allowedOrigin}`);
});
