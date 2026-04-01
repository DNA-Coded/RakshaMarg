import fp from 'fastify-plugin';
import { config } from '../config/env.js';
import { verifyIdToken } from '../services/firebaseAdmin.js';

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
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Invalid or Missing API Key'
            });
        }
    });

    fastify.decorate('verifyFirebaseToken', async function (request, reply) {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Missing Firebase Bearer token'
            });
        }

        const idToken = authHeader.slice('Bearer '.length).trim();

        if (!idToken) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Invalid Firebase Bearer token'
            });
        }

        try {
            const decodedToken = await verifyIdToken(idToken);
            request.user = decodedToken;
        } catch (error) {
            request.log.error({ err: error }, 'Firebase token verification failed');
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Invalid or expired Firebase token'
            });
        }
    });
});
