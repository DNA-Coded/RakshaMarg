import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/env.js';

export default fp(async (fastify, opts) => {
    await fastify.register(rateLimit, {
        max: config.rateLimit.max,
        timeWindow: config.rateLimit.timeWindow,
        // Hook to use for identifying clients (default is ip)
        // keyGenerator: (req) => req.headers['x-api-key'] || req.ip
    });
});
