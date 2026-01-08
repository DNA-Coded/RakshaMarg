import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';

// Import Routes
import navigationRoutes from './routes/navigation/index.js';

export async function buildApp() {
    const app = Fastify({
        logger: true
    });

    // Global Plugins
    await app.register(cors, {
        origin: true // Configure as needed for production
    });

    // Custom Plugins
    await app.register(rateLimitPlugin);
    await app.register(authPlugin);

    // Health Check
    app.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // API Routes
    await app.register(navigationRoutes, { prefix: '/api/v1/navigation' });

    return app;
}
