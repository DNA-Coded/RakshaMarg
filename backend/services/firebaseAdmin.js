import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config/env.js';

function getFirebasePrivateKey() {
    if (!config.firebasePrivateKey) {
        return null;
    }

    // Env vars usually store line breaks as \n.
    return config.firebasePrivateKey.replace(/\\n/g, '\n');
}

export function initFirebaseAdmin() {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const privateKey = getFirebasePrivateKey();

    if (!config.firebaseProjectId || !config.firebaseClientEmail || !privateKey) {
        throw new Error('Missing Firebase Admin credentials in environment');
    }

    return initializeApp({
        credential: cert({
            projectId: config.firebaseProjectId,
            clientEmail: config.firebaseClientEmail,
            privateKey
        })
    });
}

export async function verifyIdToken(idToken) {
    initFirebaseAdmin();
    const auth = getAuth();
    return auth.verifyIdToken(idToken);
}
