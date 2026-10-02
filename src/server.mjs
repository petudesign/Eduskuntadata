import { createServer } from 'node:http';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { Store } from './store.mjs';

// Local read API and built frontend. External services are never
// called from user queries. No arbitrary URL fetching or writes are exposed.
export function createApi(store, { staticRoot } = {}) {
  return createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => { response.writeHead(status); response.end(JSON.stringify(body)); };
    try {
      if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return send(405, { error: 'Only GET is supported' });
      }
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/') && staticRoot) {
        let pathname;
        try { pathname = decodeURIComponent(url.pathname); } catch { return send(400, { error: 'Invalid path' }); }
        const root = resolve(staticRoot);
        const file = resolve(root, `.${pathname}`);
        if (file !== root && !file.startsWith(root + sep)) return send(404, { error: 'Route not found' });
        let target = file;
        try { if (!statSync(target).isFile()) target = resolve(root, 'index.html'); }
        catch { target = extname(pathname) ? null : resolve(root, 'index.html'); }
        if (!target) return send(404, { error: 'Asset not found' });
        let content;
        try { content = readFileSync(target); } catch { return send(404, { error: 'Build frontend with npm run build' }); }
        const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' };
        response.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream');
        response.writeHead(200); response.end(content); return;
      }
      if (url.pathname === '/api/status') return send(200, store.coverage());
      if (url.pathname === '/api/browse') {
        const kind = url.searchParams.get('kind');
        const query = url.searchParams.get('q') || '';
        const offset = Number(url.searchParams.get('offset') || 0);
        if (!['person', 'topic', 'matter'].includes(kind) || query.length > 200 || !Number.isSafeInteger(offset) || offset < 0) {
          return send(400, { error: 'Invalid browse filters' });
        }
        return send(200, store.browse(kind, { query, state: url.searchParams.get('state') || '', offset }));
      }
      if (url.pathname === '/api/topic') {
        const topic = store.topic(url.searchParams.get('id') || '');
        return topic ? send(200, topic) : send(404, { error: 'Topic not imported' });
      }
      if (url.pathname === '/api/vote') {
        const vote = store.vote(url.searchParams.get('id') || '');
        return vote ? send(200, vote) : send(404, { error: 'Vote not imported' });
      }
      if (url.pathname === '/api/search') {
        const query = url.searchParams.get('q') || '';
        if (!query.trim() || query.length > 200) return send(400, { error: 'q must contain 1–200 characters' });
        return send(200, { results: store.search(query, url.searchParams.get('kind')), coverage: store.coverage(),
          matching: 'Literal AND search of imported records; no relevance or ideological ranking.' });
      }
      if (url.pathname === '/api/trace') {
        const trace = store.trace(url.searchParams.get('id') || '');
        return trace ? send(200, trace) : send(404, { error: 'Matter not imported' });
      }
      if (url.pathname.startsWith('/api/people/')) {
        let identifier;
        try { identifier = decodeURIComponent(url.pathname.slice('/api/people/'.length)); }
        catch { return send(400, { error: 'Invalid person identifier' }); }
        const person = store.person(identifier);
        return person ? send(200, person) : send(404, { error: 'Person not imported' });
      }
      if (url.pathname === '/api/entity') {
        const entity = store.getEntity(url.searchParams.get('id') || '');
        return entity ? send(200, entity) : send(404, { error: 'Entity not imported' });
      }
      return send(404, { error: 'Route not found' });
    } catch { send(500, { error: 'Unable to read imported records' }); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = new Store(process.env.EDUSKUNTADATA_DB || 'data/eduskuntadata.sqlite');
  const server = createApi(store, { staticRoot: fileURLToPath(new URL('../web/dist/', import.meta.url)) });
  server.listen(3001, '127.0.0.1', () => console.log('Eduskuntadata: http://127.0.0.1:3001'));
  const stop = () => server.close(() => { store.close(); process.exit(0); });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
