import http from 'node:http';
import {hostname} from 'node:os';
import {createHash} from 'node:crypto';

const instance = hostname();
let requests = 0;
let draining = false;
const server = http.createServer((request, response) => {
  const {pathname, searchParams} = new URL(request.url, 'http://localhost');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (pathname === '/live' || pathname === '/ready') {
    const ready = pathname === '/live' || !draining;
    response.writeHead(ready ? 200 : 503).end(JSON.stringify({ready, instance}));
    return;
  }
  if (request.method !== 'GET' || pathname !== '/consulta') {
    response.writeHead(404).end(JSON.stringify({error:'Use GET /consulta?item=papel'}));
    return;
  }
  const item = searchParams.get('item') || 'papel';
  const code = createHash('sha256').update(item).digest('hex').slice(0, 12);
  response.end(JSON.stringify({item, code, instance, requests: ++requests}));
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
process.on('SIGTERM', () => {
  draining = true;
  server.close(() => process.exit(0));
});
