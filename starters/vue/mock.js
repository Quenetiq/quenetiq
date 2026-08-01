import { createServer } from 'http';

const notes = [
  { id: '1', title: 'Hello Quenetiq', content: 'Your first GraphQL query works!' },
  { id: '2', title: 'Tip', content: 'Try changing this mock data' },
];

createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/graphql') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const { query } = JSON.parse(body);
      if (query && query.includes('getNotes')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { getNotes: notes } }));
        return;
      }
    });
    return;
  }
  res.writeHead(404).end();
}).listen(4000, () => console.log('Mock GraphQL: http://localhost:4000/graphql'));
