import { buildApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './config/db.js';

const app = buildApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] NCC backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

/** Close the HTTP listener and the database pool before exiting. */
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`[api] ${signal} received — shutting down`);
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
  // Never hang forever on a stuck keep-alive connection.
  setTimeout(() => process.exit(1), 10_000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, (received) => void shutdown(received));
}
