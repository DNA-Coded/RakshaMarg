import { User } from '../../models/User.js';
import { config } from '../../config/env.js';
import { triggerSOS } from '../../services/sosService.js';

export default async function hardwareRoutes(fastify) {
    fastify.post('/hardware-trigger', {
        schema: {
            body: {
                type: 'object',
                required: ['deviceId'],
                additionalProperties: false,
                properties: {
                    deviceId: { type: 'string', minLength: 1, maxLength: 100 }
                }
            }
        }
    }, async (request, reply) => {
        const deviceKey = request.headers['x-device-key'];

        if (!config.deviceKey || deviceKey !== config.deviceKey) {
            return reply.code(403).send({ error: 'Unauthorized device' });
        }

        const { deviceId } = request.body;

        request.log.info({ deviceId }, 'Hardware SOS trigger received');

        const user = await User.findOne({ deviceId }).select('_id');

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        const result = await triggerSOS(user._id, {
            source: 'hardware',
            deviceId
        });

        return reply.send({
            success: true,
            ...result
        });
    });
}
