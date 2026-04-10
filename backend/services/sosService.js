import { User } from '../models/User.js';

export async function triggerSOS(userId, metadata = {}) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    const displayName = user.displayName || user.email || user.phoneNumber || String(user._id);
    const triggeredAt = new Date();

    user.lastSosEvent = {
        source: metadata.source || 'unknown',
        deviceId: metadata.deviceId || null,
        triggeredAt,
        acknowledgedAt: null
    };

    await user.save();

    console.log('[SOS] Triggered', {
        userId: String(user._id),
        user: displayName,
        source: metadata.source || 'unknown',
        deviceId: metadata.deviceId || null,
        timestamp: triggeredAt.toISOString()
    });

    // TODO: Plug in existing notification pipeline (WhatsApp, location sharing, etc.)

    return {
        ok: true,
        userId: String(user._id),
        source: metadata.source || 'unknown',
        timestamp: triggeredAt.toISOString(),
        lastSosEvent: user.lastSosEvent
    };
}
