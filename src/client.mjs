const BASE = 'https://api.eduskunta.fi/api/v1/';

export class ParliamentClient {
  constructor({ fetcher = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
    this.fetcher = fetcher;
    this.pause = pause;
  }

  async request(path, body) {
    const url = new URL(path, BASE).href;
    const method = body === undefined ? 'GET' : 'POST';
    const requestBody = body === undefined ? null : JSON.stringify(body);
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await this.fetcher(url, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Eduskuntadata/0.1' },
        ...(requestBody === null ? {} : { body: requestBody }),
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 429 || response.status >= 500) {
        if (attempt < 2) {
          const retry = Number(response.headers.get('retry-after'));
          await response.body?.cancel();
          await this.pause(Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 30_000) : 1000 * 2 ** attempt);
          continue;
        }
      }
      if (!response.ok) throw new Error(`Eduskunta HTTP ${response.status}: ${url}`);
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch { throw new Error(`Invalid JSON from ${url}`); }
      return { url, method, requestBody, text, payload, retrievedAt: new Date().toISOString(), contentType: response.headers.get('content-type') };
    }
  }

  async *searchPages({ category, query, pageSize = 250, maxPages = 100, sort, expression } = {}) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 10_000) throw new Error('Invalid page size');
    if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('Invalid page limit');
    let offset = 0;
    let total = null;
    const seen = new Set();
    for (let page = 0; page < maxPages; page++) {
      const response = await this.request('search', {
        category, query, maxResults: pageSize, startFromIndex: offset, sort, expression,
      });
      const { results, searchMetadata } = response.payload;
      if (!Array.isArray(results) || !Number.isInteger(searchMetadata?.totalResultCount)) throw new Error('Unexpected search response');
      if (total !== null && total !== searchMetadata.totalResultCount) throw new Error('Source changed during pagination; restart sync');
      total = searchMetadata.totalResultCount;
      if (searchMetadata.startFromIndex !== offset || results.length > pageSize) throw new Error('Unexpected search pagination');
      if (!results.length && offset < total) throw new Error('Source truncated search results');
      for (const result of results) {
        if (!result.id || seen.has(result.id)) throw new Error('Duplicate/missing source ID during pagination');
        seen.add(result.id);
      }
      yield response;
      offset += results.length;
      if (offset >= total) return;
      await this.pause(200);
    }
    throw new Error(`Page limit reached before all ${total} records were fetched`);
  }

  matter(identifier) { return this.request(`valtiopaivaasiat/${encodeURIComponent(identifier)}`); }
  votes(identifier) { return this.request(`taysistunnot/asian-aanestykset/${encodeURIComponent(identifier)}`); }
  document(identifier) { return this.request(`asiakirjat/edktunnus/${encodeURIComponent(identifier)}`); }
}
