import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchema, graphql } from 'graphql';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(join(__dirname, '..', 'graphql', 'schema.graphql'), 'utf-8');
const schema = buildSchema(typeDefs);

const users = [
  { id: '550e8400-e29b-41d4-a716-446655440000', username: 'demo', password: 'demo123', masterKey: '', createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-06-01T12:00:00Z' },
  { id: '550e8400-e29b-41d4-a716-446655440001', username: 'admin', password: 'admin123', masterKey: 'mk-admin', createdAt: '2026-02-20T08:30:00Z', updatedAt: '2026-06-15T14:00:00Z' },
];

const notes = [
  { id: '660e8400-e29b-41d4-a716-446655440010', title: 'Welcome', content: 'Welcome to Quenetiq Keystore!', description: 'Getting started guide', iconUrl: null, noteType: 'NOTE', createdAt: '2026-06-01T10:00:00Z', updatedAt: null, author: users[0] },
  { id: '660e8400-e29b-41d4-a716-446655440011', title: 'GraphQL Basics', content: 'GraphQL is a query language for APIs.', description: 'Learn the fundamentals', iconUrl: null, noteType: 'NOTE', createdAt: '2026-06-02T11:00:00Z', updatedAt: '2026-06-10T09:00:00Z', author: users[0] },
  { id: '660e8400-e29b-41d4-a716-446655440012', title: 'API Keys', content: 'Production API key: sk-...', description: 'Sensitive credentials', iconUrl: null, noteType: 'PASSWORD', createdAt: '2026-06-05T15:00:00Z', updatedAt: null, author: users[1] },
];

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
    return newNote;
  },
  updateNote: ({ input }) => ({ ...notes[0], ...input, updatedAt: new Date().toISOString() }),
  deleteNote: () => true,
};

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url !== '/graphql') { res.writeHead(404); res.end('Not found'); return; }

  const body = JSON.parse(await readBody(req));
  const result = await graphql({ schema, source: body.query, variableValues: body.variables, rootValue: root });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

const port = 4000;
server.listen(port, () => {
  console.log(`Mock GraphQL server running at http://localhost:${port}/graphql`);
});
