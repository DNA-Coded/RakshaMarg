import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signInAnonymously,
    signOut,
    onAuthStateChanged,
    type User,
    type UserCredential
} from 'firebase/auth';
import { auth } from './firebase';

export function observeAuthState(callback: (user: User | null) => void) {
    if (!auth) {
        callback(null);
        return () => { };
    }

    return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
    if (!auth) {
        throw new Error('Firebase auth is not configured. Check VITE_FIREBASE_* variables.');
    }

    const provider = new GoogleAuthProvider();

    try {
        const result: UserCredential = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error: any) {
        // Popup flows can fail due to browser policies/extensions.
        // Fallback to redirect flow to complete auth reliably.
        const popupErrorCodes = [
            'auth/popup-blocked',
            'auth/popup-closed-by-user',
            'auth/cancelled-popup-request'
        ];

        if (popupErrorCodes.includes(error?.code)) {
            await signInWithRedirect(auth, provider);
            return null;
        }

        throw error;
    }
}

export async function completeRedirectSignIn() {
    if (!auth) {
        return null;
    }

    const result = await getRedirectResult(auth);
    return result?.user || null;
}

export async function signInAsGuest() {
    if (!auth) {
        throw new Error('Firebase auth is not configured. Check VITE_FIREBASE_* variables.');
    }

    const result = await signInAnonymously(auth);
    return result.user;
}

export async function signOutUser() {
    if (!auth) {
        return;
    }

    await signOut(auth);
}
