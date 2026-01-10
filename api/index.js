import { buildApp } from '../src/app.js';

const app = await buildApp();
await app.ready();

export default async function handler(req, res) {
    app.server.emit('request', req, res);
}
