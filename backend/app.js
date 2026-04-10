import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import { connectMongoDB, disconnectMongoDB, isMongoConnected } from './services/mongodb.js';
import { config } from './config/env.js';

// Import Routes
import navigationRoutes from './routes/navigation/index.js';
import userRoutes from './routes/users/index.js';
import hardwareRoutes from './routes/hardware/index.js';

export async function buildApp() {
    const app = Fastify({
        logger: true
    });

    let mongoAvailable = false;
    try {
        await connectMongoDB();
        mongoAvailable = true;
        app.log.info('MongoDB connected');
    } catch (error) {
        mongoAvailable = false;
        if (config.mongodbRequired) {
            throw error;
        }

        app.log.warn({ err: error }, 'MongoDB unavailable. Starting in degraded mode (MONGODB_REQUIRED=false).');
    }

    // Global Plugins
    await app.register(cors, {
        origin: config.corsOrigin,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-device-key']
    });

    // Custom Plugins
    await app.register(rateLimitPlugin);
    await app.register(authPlugin);

    // Health Check
    app.get('/health', async (request, reply) => {
        const databaseStatus = isMongoConnected() ? 'up' : (mongoAvailable ? 'up' : 'down');
        return {
            status: databaseStatus === 'up' ? 'ok' : 'degraded',
            database: databaseStatus,
            timestamp: new Date().toISOString()
        };
    });

    // API Routes
    await app.register(navigationRoutes, { prefix: '/api/v1/navigation' });
    await app.register(userRoutes, { prefix: '/api/v1/users' });
    await app.register(hardwareRoutes, { prefix: '/api/sos' });

    app.addHook('onClose', async () => {
        await disconnectMongoDB();
    });

    return app;
}
