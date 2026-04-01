import { User } from '../../models/User.js';

function toUserResponse(user) {
    return {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        role: user.role,
        trustedContacts: user.trustedContacts || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
    };
}

async function upsertUserFromToken(tokenUser) {
    const now = new Date();

    return User.findOneAndUpdate(
        { firebaseUid: tokenUser.uid },
        {
            $set: {
                email: tokenUser.email || null,
                displayName: tokenUser.name || null,
                photoURL: tokenUser.picture || null,
                phoneNumber: tokenUser.phone_number || null,
                lastLoginAt: now
            },
            $setOnInsert: {
                role: 'user'
            }
        },
        {
            new: true,
            upsert: true
        }
    );
}

export default async function userRoutes(fastify) {
    fastify.get('/me', {
        onRequest: [fastify.verifyApiKey, fastify.verifyFirebaseToken]
    }, async (request) => {
        const user = await upsertUserFromToken(request.user);

        return {
            user: toUserResponse(user)
        };
    });

    fastify.patch('/me', {
        onRequest: [fastify.verifyApiKey, fastify.verifyFirebaseToken],
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    displayName: { type: 'string', minLength: 1, maxLength: 100 },
                    phoneNumber: { type: 'string', minLength: 5, maxLength: 30 },
                    photoURL: { type: 'string', minLength: 1, maxLength: 500 }
                }
            }
        }
    }, async (request, reply) => {
        const allowedUpdates = {};
        const { displayName, phoneNumber, photoURL } = request.body || {};

        if (displayName !== undefined) allowedUpdates.displayName = displayName;
        if (phoneNumber !== undefined) allowedUpdates.phoneNumber = phoneNumber;
        if (photoURL !== undefined) allowedUpdates.photoURL = photoURL;

        if (Object.keys(allowedUpdates).length === 0) {
            return reply.code(400).send({
                error: 'Bad Request',
                message: 'No updatable profile fields provided'
            });
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: request.user.uid },
            { $set: allowedUpdates },
            { new: true }
        );

        if (!user) {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'User profile not found'
            });
        }

        return {
            user: toUserResponse(user)
        };
    });

    fastify.get('/me/trusted-contacts', {
        onRequest: [fastify.verifyApiKey, fastify.verifyFirebaseToken]
    }, async (request) => {
        const user = await upsertUserFromToken(request.user);
        return {
            contacts: user.trustedContacts || []
        };
    });

    fastify.put('/me/trusted-contacts', {
        onRequest: [fastify.verifyApiKey, fastify.verifyFirebaseToken],
        schema: {
            body: {
                type: 'object',
                required: ['contacts'],
                additionalProperties: false,
                properties: {
                    contacts: {
                        type: 'array',
                        maxItems: 20,
                        items: {
                            type: 'object',
                            required: ['name', 'phone'],
                            additionalProperties: false,
                            properties: {
                                name: { type: 'string', minLength: 1, maxLength: 100 },
                                phone: { type: 'string', minLength: 3, maxLength: 30 }
                            }
                        }
                    }
                }
            }
        }
    }, async (request) => {
        const normalizedContacts = (request.body.contacts || []).map((contact) => ({
            name: String(contact.name).trim(),
            phone: String(contact.phone).trim()
        }));

        const user = await User.findOneAndUpdate(
            { firebaseUid: request.user.uid },
            {
                $set: {
                    trustedContacts: normalizedContacts
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        return {
            contacts: user.trustedContacts || []
        };
    });
}
