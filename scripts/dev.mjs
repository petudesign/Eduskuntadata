import { createServer } from 'vite';
import { Store } from '../src/store.mjs';
import { createApi } from '../src/server.mjs';

const store = new Store(process.env.EDUSKUNTADATA_DB || 'data/eduskuntadata.sqlite');
const api = createApi(store);
let vite;
try {
  await new Promise((resolve, reject) => {
    api.once('error', reject);
    api.listen(3001, '127.0.0.1', resolve);
  });
  vite = await createServer();
  await vite.listen();
  vite.printUrls();
} catch (error) {
  console.error(error.message);
  await vite?.close();
  api.close();
  store.close();
  process.exitCode = 1;
}
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await vite?.close();
  await new Promise(resolve => api.close(resolve));
  store.close();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
