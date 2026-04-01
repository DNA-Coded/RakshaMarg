import crypto from 'crypto';

const ACTIVE_ALERTS = new Map();

const DEFAULT_ESCALATION_DELAY_SECONDS = Number(process.env.SOS_ESCALATION_DELAY_SECONDS || 180);
const DEFAULT_MAX_ESCALATION_LEVEL = Number(process.env.SOS_MAX_ESCALATION_LEVEL || 3);

function nowIso() {
    return new Date().toISOString();
}

function normalizeContacts(contacts = []) {
    if (!Array.isArray(contacts)) return [];

    return contacts
        .map((contact) => ({
            id: contact.id || crypto.randomUUID(),
            name: contact.name || 'Trusted Contact',
            phone: contact.phone || '',
            channelPreference: contact.channelPreference || 'sms',
        }))
        .filter((contact) => contact.phone || contact.id);
}

function buildContactMessage(alert, contact) {
    return {
        to: contact.phone,
        contactName: contact.name,
        alertId: alert.id,
        type: alert.type,
        message: alert.message,
        routeSummary: alert.routeSummary,
        coordinates: alert.coordinates,
        createdAt: alert.createdAt,
    };
}

async function sendContactAlert(contact, alert) {
    const dispatchMode = (process.env.GUARDIAN_DISPATCH_MODE || 'mock').toLowerCase();
    const payload = buildContactMessage(alert, contact);

    if (dispatchMode === 'mock') {
        return {
            channel: contact.channelPreference,
            status: 'sent',
            mode: 'mock',
            providerMessageId: `mock-${crypto.randomUUID()}`,
        };
    }

    if (dispatchMode === 'webhook') {
        const webhookResult = await sendWebhookAlert({
            type: 'guardian_contact_dispatch',
            payload,
        });

        return {
            channel: contact.channelPreference,
            status: webhookResult.status === 'sent' ? 'sent' : 'failed',
            mode: 'webhook',
            ...webhookResult,
        };
    }

    return {
        channel: contact.channelPreference,
        status: 'failed',
        reason: `unsupported_dispatch_mode:${dispatchMode}`,
    };
}

async function sendWebhookAlert(payload) {
    const webhookUrl = process.env.GUARDIAN_ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
        return {
            channel: 'webhook',
            status: 'skipped',
            reason: 'webhook_not_configured',
        };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {
                channel: 'webhook',
                status: 'failed',
                code: response.status,
            };
        }

        return {
            channel: 'webhook',
            status: 'sent',
            code: response.status,
        };
    } catch (error) {
        return {
            channel: 'webhook',
            status: 'failed',
            error: error.message,
        };
    }
}

function createContactDispatchRecords(contacts, context, status = 'queued') {
    return contacts.map((contact) => ({
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        channel: contact.channelPreference,
        status,
        dispatchedAt: nowIso(),
        context,
    }));
}

function scheduleEscalation(alertId) {
    const alert = ACTIVE_ALERTS.get(alertId);
    if (!alert) return;

    if (alert.escalationTimeout) {
        clearTimeout(alert.escalationTimeout);
    }

    alert.escalationTimeout = setTimeout(async () => {
        const latestAlert = ACTIVE_ALERTS.get(alertId);
        if (!latestAlert || latestAlert.state !== 'active') {
            return;
        }

        if (latestAlert.acknowledgements.length > 0) {
            return;
        }

        if (latestAlert.escalationLevel >= latestAlert.maxEscalationLevel) {
            latestAlert.state = 'max_escalation_reached';
            latestAlert.lastUpdatedAt = nowIso();
            return;
        }

        latestAlert.escalationLevel += 1;
        latestAlert.lastUpdatedAt = nowIso();
        latestAlert.dispatches.push({
            channel: 'escalation',
            status: 'sent',
            escalationLevel: latestAlert.escalationLevel,
            dispatchedAt: nowIso(),
            reason: 'no_acknowledgement_received',
        });

        const escalationPayload = {
            alertId: latestAlert.id,
            type: 'sos_escalation',
            escalationLevel: latestAlert.escalationLevel,
            journeyContext: latestAlert.journeyContext,
            coordinates: latestAlert.coordinates,
            timestamp: nowIso(),
        };

        const webhookDispatch = await sendWebhookAlert(escalationPayload);
        latestAlert.dispatches.push({
            ...webhookDispatch,
            dispatchedAt: nowIso(),
            escalationLevel: latestAlert.escalationLevel,
        });

        scheduleEscalation(alertId);
    }, alert.escalationDelaySeconds * 1000);
}

export const guardianAlertService = {
    async triggerSosAlert(payload = {}) {
        const contacts = normalizeContacts(payload.contacts);
        const alertId = crypto.randomUUID();
        const createdAt = nowIso();

        const alert = {
            id: alertId,
            type: payload.type || 'manual_sos',
            state: 'active',
            createdAt,
            lastUpdatedAt: createdAt,
            initiatedBy: payload.userId || 'anonymous',
            journeyId: payload.journeyId || null,
            routeSummary: payload.routeSummary || null,
            message: payload.message || 'Emergency alert triggered from RakshaMarg.',
            coordinates: payload.coordinates || null,
            contacts,
            acknowledgements: [],
            dispatches: createContactDispatchRecords(contacts, 'initial_sos', 'queued'),
            escalationLevel: 0,
            escalationDelaySeconds: Number(payload.escalationDelaySeconds || DEFAULT_ESCALATION_DELAY_SECONDS),
            maxEscalationLevel: Number(payload.maxEscalationLevel || DEFAULT_MAX_ESCALATION_LEVEL),
            journeyContext: payload.journeyContext || {},
            metadata: payload.metadata || {},
            escalationTimeout: null,
        };

        for (const contact of contacts) {
            const contactDispatch = await sendContactAlert(contact, alert);
            alert.dispatches.push({
                contactId: contact.id,
                name: contact.name,
                phone: contact.phone,
                channel: contact.channelPreference,
                context: 'initial_sos',
                ...contactDispatch,
                dispatchedAt: nowIso(),
            });
        }

        const webhookDispatch = await sendWebhookAlert({
            alertId,
            type: alert.type,
            message: alert.message,
            journeyId: alert.journeyId,
            routeSummary: alert.routeSummary,
            coordinates: alert.coordinates,
            contacts,
            timestamp: createdAt,
            metadata: alert.metadata,
        });

        alert.dispatches.push({
            ...webhookDispatch,
            dispatchedAt: nowIso(),
        });

        ACTIVE_ALERTS.set(alertId, alert);
        scheduleEscalation(alertId);

        return this.getAlertStatus(alertId);
    },

    acknowledgeAlert(alertId, acknowledgement = {}) {
        const alert = ACTIVE_ALERTS.get(alertId);
        if (!alert) {
            return null;
        }

        if (alert.escalationTimeout) {
            clearTimeout(alert.escalationTimeout);
            alert.escalationTimeout = null;
        }

        alert.acknowledgements.push({
            acknowledgedAt: nowIso(),
            contactId: acknowledgement.contactId || null,
            contactName: acknowledgement.contactName || null,
            channel: acknowledgement.channel || 'manual',
            note: acknowledgement.note || '',
        });

        alert.state = 'acknowledged';
        alert.lastUpdatedAt = nowIso();

        return this.getAlertStatus(alertId);
    },

    getAlertStatus(alertId) {
        const alert = ACTIVE_ALERTS.get(alertId);
        if (!alert) {
            return null;
        }

        return {
            id: alert.id,
            type: alert.type,
            state: alert.state,
            createdAt: alert.createdAt,
            lastUpdatedAt: alert.lastUpdatedAt,
            initiatedBy: alert.initiatedBy,
            journeyId: alert.journeyId,
            routeSummary: alert.routeSummary,
            message: alert.message,
            coordinates: alert.coordinates,
            escalationLevel: alert.escalationLevel,
            escalationDelaySeconds: alert.escalationDelaySeconds,
            maxEscalationLevel: alert.maxEscalationLevel,
            contacts: alert.contacts,
            acknowledgements: alert.acknowledgements,
            dispatches: alert.dispatches,
        };
    },
};
