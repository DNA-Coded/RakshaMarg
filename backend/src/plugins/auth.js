import fp from 'fastify-plugin';
import { config } from '../config/env.js';

/**
 * Authentication plugin
 * - Verifies API Key
 * - (Optional) Verifies Firebase ID Token
 */
export default fp(async (fastify, opts) => {
    fastify.decorate('verifyApiKey', async function (request, reply) {
        const apiKey = request.headers[config.apiKeyHeader];

        // In a real app, you might check this against a database of valid keys
        // For now, we compare against a single server-side key or allow bypass if in dev?
        // User requested "API key based authentication".
        // We will assume clients must send a valid key.

        // Simple check: compare with env var (if established) or just presence
        // If user didn't provide a list of keys, we'll implement a simple equality check 
        // against a master key for now, or assume a list later. 
        // Let's use a dummy check or master key if defined.

        // If no key defined in env, log warning and skip (or fail secure?) -> fail secure.
        // However, for scaffold, let's just check presence or a hardcoded/env secret.

        // Check against the configured API Key
        if (!apiKey || apiKey !== config.appApiKey) {
            throw new Error('Invalid or Missing API Key');
        }
    });
});
