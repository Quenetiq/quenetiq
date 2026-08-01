import { createServer } from 'node:http';

// ── Mock schema (in-memory store) ───────────────────────────────────────────
let users = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' },
];
let nextUserId = 3;

let todos = [
  { id: '1', title: 'Buy milk', completed: false },
  { id: '2', title: 'Write docs', completed: true },
];
let nextTodoId = 3;

// ── APQ (Automatic Persisted Queries) store ────────────────────────────────
const persistedQueries = new Map();

// ── Quick & dirty GraphQL field extractor ─────────────────────────────────────
function extractFields(query) {
  let s = query.replace(/\u0022[^\u0022]*\u0022/g, '');
  s = s.replace(/#[^\n]*/g, '');
  s = s.replace(/(query|mutation)\s+\w*\s*\([^)]*\)/g, '$1');
  const fields = new Set();
  const re = /[\s{(,](\w+)\s*(?:[({]|$)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const word = m[1];
    if (['query','mutation','fragment','on','type','interface','null','true','false'].includes(word)) continue;
    fields.add(word);
  }
  return Array.from(fields);
}

function opType(query) {
  if (/^\s*mutation\b/.test(query)) return 'mutation';
  return 'query';
}

// ── Resolvers ────────────────────────────────────────────────────────────────
function resolveQuery(fields, variables) {
  const response = {};
  for (const name of fields) {
    switch (name) {
      case 'users':
        response.users = users.map(u => ({ ...u }));
        break;
      case 'user':
        response.user = users.find(u => u.id === String(variables?.id)) ?? null;
        break;
      case 'todos':
        response.todos = todos.map(t => ({ ...t }));
        break;
      case 'todo':
        response.todo = todos.find(t => t.id === String(variables?.id)) ?? null;
        break;
    }
  }
  return response;
}

function resolveMutation(fields, variables) {
  const response = {};
  for (const name of fields) {
    switch (name) {
      case 'createUser': {
        const u = { id: String(nextUserId++), name: variables?.name ?? '', email: variables?.email ?? '' };
        users.push(u);
        response.createUser = u;
        break;
      }
      case 'createTodo': {
        const t = { id: String(nextTodoId++), title: variables?.title ?? '', completed: false };
        todos.push(t);
        response.createTodo = t;
        break;
      }
      case 'completeTodo': {
        const t = todos.find(t => t.id === String(variables?.id));
        if (t) t.completed = true;
        response.completeTodo = t ?? null;
        break;
      }
    }
  }
  return response;
}

// ── HTTP Server ──────────────────────────────────────────────────────────────
function jsonResponse(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method !== 'POST') { jsonResponse(res, 405, { error: 'Method not allowed' }); return; }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      // Check for batch request (array) or single request (object)
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) {
        // Batched request
        const results = parsed.map(item => handleSingle(item, req));
        jsonResponse(res, 200, results);
      } else {
        jsonResponse(res, 200, handleSingle(parsed, req));
      }
    } catch (err) {
      jsonResponse(res, 400, { error: 'Invalid JSON: ' + err.message });
    }
  });
});

function handleSingle(body, req) {
  const { query, variables, extensions } = body;

  // APQ: if query is empty, check for persisted query hash
  if (extensions?.persistedQuery?.sha256Hash) {
    const hash = extensions.persistedQuery.sha256Hash;
    if (!query || query.trim() === '') {
      const stored = persistedQueries.get(hash);
      if (stored) {
        const result = execute(stored, variables);
        return result;
      }
      return {
        errors: [{ message: 'PersistedQueryNotFound', extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } }],
      };
    }
    persistedQueries.set(hash, query);
    return execute(query, variables);
  }

  return execute(query, variables);
}

function execute(query, variables) {
  const fields = extractFields(query);
  const type = opType(query);
  try {
    let data;
    if (type === 'mutation') {
      data = resolveMutation(fields, variables);
    } else {
      data = resolveQuery(fields, variables);
    }
    return { data };
  } catch (err) {
    return { errors: [{ message: err.message }], data: null };
  }
}

// ── Start server and run tests ───────────────────────────────────────────────
const PORT = 0; // random port
server.listen(PORT, async () => {
  const port = server.address().port;
  const url = `http://localhost:${port}/graphql`;
  console.log(`\n🚀 Mock GraphQL server at ${url}\n`);

  const passed = [];
  const failed = [];

  function check(name, ok, detail = '') {
    if (ok) { passed.push(name); console.log(`  ✅ ${name}`); }
    else { failed.push(name); console.log(`  ❌ ${name}${detail ? ': ' + detail : ''}`); }
  }

  try {
    // ── Test 1: Simple query ──────────────────────────────────────────────
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ users { id name email } }' }),
      });
      const json = await res.json();
      check('simple query', json.data?.users?.length === 2 && json.data.users[0].name === 'Alice');
    }

    // ── Test 2: Query with variables ───────────────────────────────────────
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query GetUser($id: ID!) { user(id: $id) { id name email } }',
          variables: { id: '2' },
        }),
      });
      const json = await res.json();
      check('query with variables', json.data?.user?.name === 'Bob');
    }

    // ── Test 3: Query with nonexistent id (returns null) ───────────────────
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ user(id: 999) { id name } }',
        }),
      });
      const json = await res.json();
      check('nonexistent user returns null', json.data?.user === null);
    }

    // ── Test 4: Simple mutation with variables ─────────────────────────────
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation CreateUser($name: String!, $email: String!) { createUser(name: $name, email: $email) { id name email } }',
          variables: { name: 'Charlie', email: 'charlie@test.com' },
        }),
      });
      const json = await res.json();
      check('create user mutation', json.data?.createUser?.name === 'Charlie');
    }

    // ── Test 5: Verify mutation persisted ──────────────────────────────────
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ users { name } }' }),
      });
      const json = await res.json();
      check('mutation persisted (3 users)', json.data?.users?.length === 3 && json.data.users[2].name === 'Charlie');
    }

    // ── Test 6: Mutation with variables ────────────────────────────────────
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation CreateTodo($title: String!) { createTodo(title: $title) { id title completed } }',
          variables: { title: 'Test Quenetiq' },
        }),
      });
      const json = await res.json();
      check('create todo mutation', json.data?.createTodo?.title === 'Test Quenetiq' && json.data?.createTodo?.completed === false);
    }

    // ── Test 7: APQ — first request registers hash ─────────────────────────
    {
      const q = '{ todos { id title } }';
      const hash = await sha256(q);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
        }),
      });
      const json = await res.json();
      check('APQ register', json.data?.todos?.length >= 2 && json.data.todos[0].title === 'Buy milk');
    }

    // ── Test 8: APQ — second request sends hash only ───────────────────────
    {
      const hash = await sha256('{ todos { id title } }');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
        }),
      });
      const json = await res.json();
      check('APQ hash-only', json.data?.todos?.length >= 2);
    }

    // ── Test 9: Batched query with variables ───────────────────────────────
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { query: 'query GetUser($id: ID!) { user(id: $id) { name } }', variables: { id: '1' } },
          { query: 'query GetUser($id: ID!) { user(id: $id) { name } }', variables: { id: '2' } },
        ]),
      });
      const json = await res.json();
      check('batched query',
        Array.isArray(json) && json.length === 2
        && json[0].data?.user?.name === 'Alice'
        && json[1].data?.user?.name === 'Bob',
      );
    }

  } catch (err) {
    console.error('\n  💥 Unexpected error:', err.message);
    failed.push('(runtime error)');
  } finally {
    // ── Summary ───────────────────────────────────────────────────────────
    console.log(`\n  ─────────────────────────────────`);
    console.log(`  Total: ${passed.length + failed.length}`);
    console.log(`  ✅ Passed: ${passed.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);
    console.log();
    server.close();
    process.exit(failed.length > 0 ? 1 : 0);
  }
});

// ── Utility: SHA-256 hex digest ──────────────────────────────────────────────
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
