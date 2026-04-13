import twilio from 'twilio';
import { config } from '../config/env.js';

let cachedTwilioClient = null;

function getTwilioClient() {
    if (cachedTwilioClient) {
        return cachedTwilioClient;
    }

    if (!config.twilioAccountSid || !config.twilioAuthToken) {
        return null;
    }

    cachedTwilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
    return cachedTwilioClient;
}

function normalizePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
        return null;
    }

    const trimmed = phone.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('+')) {
        const normalized = `+${trimmed.slice(1).replace(/\D/g, '')}`;
        return normalized.length > 1 ? normalized : null;
    }

    if (trimmed.startsWith('00')) {
        const normalized = `+${trimmed.slice(2).replace(/\D/g, '')}`;
        return normalized.length > 1 ? normalized : null;
    }

    const digits = trimmed.replace(/\D/g, '');
    return digits ? `+${digits}` : null;
}

function toWhatsappAddress(phone) {
    const normalized = normalizePhoneNumber(phone);
    return normalized ? `whatsapp:${normalized}` : null;
}

function resolveLatLng(metadata = {}) {
    const fromLocation = metadata.location && typeof metadata.location === 'object'
        ? { lat: metadata.location.lat, lng: metadata.location.lng }
        : null;

    const lat = Number(
        fromLocation?.lat ?? metadata.lat ?? metadata.currentLat ?? metadata.latitude
    );
    const lng = Number(
        fromLocation?.lng ?? metadata.lng ?? metadata.currentLng ?? metadata.longitude
    );

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat, lng };
}

function resolveLatLngFromUser(user) {
    const lat = Number(user?.lastKnownLocation?.lat);
    const lng = Number(user?.lastKnownLocation?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat, lng };
}

function buildGoogleMapsLocationUrl(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

function buildSosMessage({ user, triggeredAt, metadata }) {
    const displayName = user.displayName || user.email || user.phoneNumber || String(user._id);
    const latLng = resolveLatLng(metadata) || resolveLatLngFromUser(user);
    const locationUrl = typeof metadata?.locationUrl === 'string' && metadata.locationUrl.trim()
        ? metadata.locationUrl.trim()
        : buildGoogleMapsLocationUrl(latLng?.lat, latLng?.lng);
    const locationLine = locationUrl
        ? `Location: ${locationUrl}`
        : 'Location: Not available';

    return [
        'RAKSHAMARG SOS ALERT',
        `User: ${displayName}`,
        `Time: ${triggeredAt.toISOString()}`,
        locationLine,
        'Please reach out immediately.'
    ].join('\n');
}

async function sendSmsMessage({ client, to, body }) {
    return client.messages.create({
        to,
        body,
        messagingServiceSid: config.twilioMessagingServiceSid
    });
}

async function sendWhatsappFallback({ client, to, body }) {
    if (!config.twilioWhatsappFallbackEnabled || !config.twilioWhatsappFrom) {
        return null;
    }

    const whatsappTo = toWhatsappAddress(to);
    const whatsappFrom = toWhatsappAddress(config.twilioWhatsappFrom);

    if (!whatsappTo || !whatsappFrom) {
        return null;
    }

    return client.messages.create({
        to: whatsappTo,
        from: whatsappFrom,
        body
    });
}

export async function sendSosNotifications({ user, metadata = {}, triggeredAt = new Date() }) {
    const notificationsEnabled = config.twilioSosEnabled;
    const client = getTwilioClient();

    if (!notificationsEnabled) {
        return {
            enabled: false,
            reason: 'TWILIO_SOS_ENABLED is false',
            message: null,
            attempted: 0,
            smsSent: 0,
            whatsappSent: 0,
            failed: 0,
            results: []
        };
    }

    if (!client || !config.twilioMessagingServiceSid) {
        return {
            enabled: false,
            reason: 'Missing Twilio credentials or Messaging Service SID',
            message: null,
            attempted: 0,
            smsSent: 0,
            whatsappSent: 0,
            failed: 0,
            results: []
        };
    }

    const dedupedContacts = [];
    const seenPhones = new Set();

    for (const contact of user.trustedContacts || []) {
        const normalizedPhone = normalizePhoneNumber(contact?.phone);

        if (!normalizedPhone || seenPhones.has(normalizedPhone)) {
            continue;
        }

        seenPhones.add(normalizedPhone);
        dedupedContacts.push({
            name: contact?.name || 'Trusted Contact',
            phone: normalizedPhone
        });
    }

    const messageBody = buildSosMessage({ user, triggeredAt, metadata });
    const results = [];

    for (const contact of dedupedContacts) {
        try {
            const sms = await sendSmsMessage({
                client,
                to: contact.phone,
                body: messageBody
            });

            results.push({
                name: contact.name,
                phone: contact.phone,
                channel: 'sms',
                success: true,
                sid: sms.sid
            });
            continue;
        } catch (smsError) {
            try {
                const wa = await sendWhatsappFallback({
                    client,
                    to: contact.phone,
                    body: messageBody
                });

                if (wa) {
                    results.push({
                        name: contact.name,
                        phone: contact.phone,
                        channel: 'whatsapp',
                        success: true,
                        sid: wa.sid,
                        fallbackFrom: 'sms',
                        smsError: smsError.message
                    });
                    continue;
                }
            } catch (waError) {
                results.push({
                    name: contact.name,
                    phone: contact.phone,
                    channel: 'whatsapp',
                    success: false,
                    fallbackFrom: 'sms',
                    smsError: smsError.message,
                    whatsappError: waError.message
                });
                continue;
            }

            results.push({
                name: contact.name,
                phone: contact.phone,
                channel: 'sms',
                success: false,
                smsError: smsError.message,
                whatsappFallbackConfigured: false
            });
        }
    }

    const smsSent = results.filter((item) => item.success && item.channel === 'sms').length;
    const whatsappSent = results.filter((item) => item.success && item.channel === 'whatsapp').length;
    const failed = results.filter((item) => !item.success).length;

    return {
        enabled: true,
        reason: null,
        message: messageBody,
        attempted: dedupedContacts.length,
        smsSent,
        whatsappSent,
        failed,
        results
    };
}
