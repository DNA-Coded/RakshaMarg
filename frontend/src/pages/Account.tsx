import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/lib/apiHeaders';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
    id: string;
    firebaseUid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
}

const Account = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
                method: 'GET',
                headers: await getAuthHeaders()
            });

            if (!response.ok) {
                const details = await response.text().catch(() => '');
                throw new Error(details || `Failed to load profile (${response.status})`);
            }

            const data = await response.json();
            setProfile(data.user || null);
        } catch (error) {
            console.error('Failed to load profile:', error);
            toast({
                title: 'Profile load failed',
                description: 'Unable to load account details from server.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleManualSync = async () => {
        try {
            setIsSyncing(true);
            await loadProfile();
            toast({
                title: 'Profile synced',
                description: 'Your account is up to date.'
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white">
            <Helmet>
                <title>My Account | RakshaMarg</title>
            </Helmet>

            <Navbar />

            <main className="container px-4 pt-32 pb-20">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between gap-3 mb-8">
                        <div>
                            <h1 className="font-display text-4xl font-bold">My Account</h1>
                            <p className="text-white/70 mt-2">Firebase login linked with MongoDB user profile.</p>
                        </div>
                        <Button
                            onClick={handleManualSync}
                            disabled={isSyncing || isLoading}
                            className="bg-white text-brand-dark hover:bg-brand-teal hover:text-white"
                        >
                            {isSyncing ? 'Syncing...' : 'Sync Profile'}
                        </Button>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                        {isLoading ? (
                            <p className="text-white/70">Loading profile...</p>
                        ) : profile ? (
                            <div className="space-y-3 text-sm md:text-base">
                                <p><span className="text-white/60">Name:</span> {profile.displayName || 'Not set'}</p>
                                <p><span className="text-white/60">Email:</span> {profile.email || 'Not set'}</p>
                                <p><span className="text-white/60">Phone:</span> {profile.phoneNumber || 'Not set'}</p>
                                <p><span className="text-white/60">Role:</span> {profile.role}</p>
                                <p><span className="text-white/60">Firebase UID:</span> <span className="break-all">{profile.firebaseUid}</span></p>
                                <p><span className="text-white/60">Last Login:</span> {new Date(profile.lastLoginAt).toLocaleString()}</p>
                            </div>
                        ) : (
                            <p className="text-white/70">No profile data found.</p>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Account;
