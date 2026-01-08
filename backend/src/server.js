import { buildApp } from './app.js';
import { config } from './config/env.js';

const start = async () => {
    const app = await buildApp();
    // app.printRoutes();

    try {
        await app.listen({ port: config.port, host: '0.0.0.0' });
        console.log(`Server listening on port ${config.port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
