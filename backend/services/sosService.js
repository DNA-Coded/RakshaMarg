import { User } from '../models/User.js';
import { sendSosNotifications } from './twilioService.js';

export async function triggerSOS(userId, metadata = {}) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    const displayName = user.displayName || user.email || user.phoneNumber || String(user._id);
    const triggeredAt = new Date();

    const location = metadata?.location && typeof metadata.location === 'object'
        ? metadata.location
        : null;

    const lat = Number(location?.lat ?? metadata?.lat ?? metadata?.currentLat ?? metadata?.latitude);
    const lng = Number(location?.lng ?? metadata?.lng ?? metadata?.currentLng ?? metadata?.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        user.lastKnownLocation = {
            lat,
            lng,
            accuracyMeters: Number(metadata?.accuracyMeters ?? metadata?.accuracy ?? NaN) || null,
            source: metadata?.source || 'sos',
            updatedAt: triggeredAt
        };
    }

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

    const notification = await sendSosNotifications({
        user,
        metadata,
        triggeredAt
    });

    console.log('[SOS] Notification summary', {
        userId: String(user._id),
        enabled: notification.enabled,
        attempted: notification.attempted,
        smsSent: notification.smsSent,
        whatsappSent: notification.whatsappSent,
        failed: notification.failed,
        reason: notification.reason
    });

    return {
        ok: true,
        userId: String(user._id),
        source: metadata.source || 'unknown',
        timestamp: triggeredAt.toISOString(),
        lastSosEvent: user.lastSosEvent,
        notification
    };
}
