import crypto from 'crypto';
import { guardianAlertService } from './guardianAlertService.js';

const CHECK_IN_SESSIONS = new Map();
const SWEEP_INTERVAL_MS = Number(process.env.CHECK_IN_SWEEP_INTERVAL_MS || 10000);

let sweepTimerStarted = false;

function nowIso() {
    return new Date().toISOString();
}

function ensureSweepTimer() {
    if (sweepTimerStarted) {
        return;
    }

    sweepTimerStarted = true;

    setInterval(() => {
        const now = Date.now();

        for (const session of CHECK_IN_SESSIONS.values()) {
            if (session.state !== 'active') {
                continue;
            }

            if (now <= session.nextCheckInDueAtMs + session.gracePeriodSeconds * 1000) {
                continue;
            }

            session.missedCheckIns += 1;
            session.lastUpdatedAt = nowIso();
            session.nextCheckInDueAtMs = now + session.intervalSeconds * 1000;

            session.timeline.push({
                type: 'missed_check_in',
                at: nowIso(),
                missedCount: session.missedCheckIns,
            });

            if (session.missedCheckIns >= session.maxMissedCheckInsBeforeEscalation) {
                session.state = 'escalated';
                session.lastUpdatedAt = nowIso();

                void guardianAlertService
                    .triggerSosAlert({
                        type: 'missed_check_in',
                        userId: session.userId,
                        journeyId: session.journeyId,
                        routeSummary: session.routeSummary,
                        coordinates: session.lastKnownCoordinates,
                        contacts: session.contacts,
                        message: `Check-in missed ${session.missedCheckIns} times for session ${session.id}.`,
                        journeyContext: {
                            checkInSessionId: session.id,
                            nextCheckInDueAt: new Date(session.nextCheckInDueAtMs).toISOString(),
                        },
                        metadata: {
                            source: 'check_in_scheduler',
                        },
                    })
                    .then((alertStatus) => {
                        session.escalationAlertId = alertStatus.id;
                        session.timeline.push({
                            type: 'escalation_triggered',
                            at: nowIso(),
                            alertId: alertStatus.id,
                        });
                        session.lastUpdatedAt = nowIso();
                    })
                    .catch((error) => {
                        session.timeline.push({
                            type: 'escalation_error',
                            at: nowIso(),
                            error: error.message,
                        });
                        session.lastUpdatedAt = nowIso();
                    });
            }
        }
    }, SWEEP_INTERVAL_MS);
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

function formatSession(session) {
    return {
        id: session.id,
        state: session.state,
        userId: session.userId,
        journeyId: session.journeyId,
        routeSummary: session.routeSummary,
        intervalSeconds: session.intervalSeconds,
        gracePeriodSeconds: session.gracePeriodSeconds,
        maxMissedCheckInsBeforeEscalation: session.maxMissedCheckInsBeforeEscalation,
        missedCheckIns: session.missedCheckIns,
        nextCheckInDueAt: new Date(session.nextCheckInDueAtMs).toISOString(),
        createdAt: session.createdAt,
        lastUpdatedAt: session.lastUpdatedAt,
        contacts: session.contacts,
        escalationAlertId: session.escalationAlertId,
        timeline: session.timeline,
    };
}

ensureSweepTimer();

export const checkInService = {
    startSession(payload = {}) {
        const intervalSeconds = Math.max(30, Number(payload.intervalSeconds || 120));
        const gracePeriodSeconds = Math.max(15, Number(payload.gracePeriodSeconds || 60));
        const maxMissedCheckInsBeforeEscalation = Math.max(1, Number(payload.maxMissedCheckInsBeforeEscalation || 2));
        const contacts = normalizeContacts(payload.contacts);
        const createdAt = nowIso();
        const id = crypto.randomUUID();

        const session = {
            id,
            state: 'active',
            userId: payload.userId || 'anonymous',
            journeyId: payload.journeyId || null,
            routeSummary: payload.routeSummary || null,
            intervalSeconds,
            gracePeriodSeconds,
            maxMissedCheckInsBeforeEscalation,
            missedCheckIns: 0,
            nextCheckInDueAtMs: Date.now() + intervalSeconds * 1000,
            contacts,
            lastKnownCoordinates: payload.coordinates || null,
            escalationAlertId: null,
            createdAt,
            lastUpdatedAt: createdAt,
            timeline: [
                {
                    type: 'session_started',
                    at: createdAt,
                },
            ],
        };

        CHECK_IN_SESSIONS.set(id, session);
        return formatSession(session);
    },

    pingSession(sessionId, payload = {}) {
        const session = CHECK_IN_SESSIONS.get(sessionId);
        if (!session) {
            return null;
        }

        if (session.state !== 'active') {
            return formatSession(session);
        }

        session.missedCheckIns = 0;
        session.nextCheckInDueAtMs = Date.now() + session.intervalSeconds * 1000;
        session.lastKnownCoordinates = payload.coordinates || session.lastKnownCoordinates;
        session.lastUpdatedAt = nowIso();
        session.timeline.push({
            type: 'check_in_received',
            at: nowIso(),
        });

        return formatSession(session);
    },

    stopSession(sessionId, reason = 'manual_stop') {
        const session = CHECK_IN_SESSIONS.get(sessionId);
        if (!session) {
            return null;
        }

        session.state = 'stopped';
        session.lastUpdatedAt = nowIso();
        session.timeline.push({
            type: 'session_stopped',
            at: nowIso(),
            reason,
        });

        return formatSession(session);
    },

    getSession(sessionId) {
        const session = CHECK_IN_SESSIONS.get(sessionId);
        if (!session) {
            return null;
        }

        return formatSession(session);
    },
};
