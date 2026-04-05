import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult
} from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { API_BASE_URL } from '@/config';
import { auth } from '@/lib/firebase';
import { getAuthHeaders } from '@/lib/apiHeaders';
import {
    completeRedirectSignIn,
    observeAuthState,
    signInAsGuest,
    signInWithGoogle
} from '@/lib/firebaseAuth';
import { toast } from '@/hooks/use-toast';

const Login = () => {
    const navigate = useNavigate();
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
    const [isLoadingGuest, setIsLoadingGuest] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const isFirebaseConfigured = Boolean(auth);

    const syncProfile = async () => {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: 'GET',
            headers: await getAuthHeaders()
        });

        if (!response.ok) {
            const details = await response.text().catch(() => '');
            throw new Error(details || `Profile sync failed (${response.status})`);
        }
    };

    useEffect(() => {
        const unsubscribe = observeAuthState((user) => {
            if (user) {
                navigate('/account', { replace: true });
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        const handleRedirectResult = async () => {
            try {
                const user = await completeRedirectSignIn();
                if (!user) return;

                await syncProfile();
                toast({
                    title: 'Signed in',
                    description: 'Welcome back. Your account is synced.'
                });
                navigate('/account', { replace: true });
            } catch (error) {
                console.error('Redirect sign-in failed:', error);
                toast({
                    title: 'Sign-in failed',
                    description: 'Could not complete redirect sign-in.',
                    variant: 'destructive'
                });
            }
        };

        handleRedirectResult();
    }, [navigate]);

    useEffect(() => {
        return () => {
            if (recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current.clear();
                recaptchaVerifierRef.current = null;
            }
        };
    }, []);

    const getRecaptchaVerifier = () => {
        if (!auth) {
            throw new Error('Firebase auth is not configured.');
        }

        if (recaptchaVerifierRef.current) {
            return recaptchaVerifierRef.current;
        }

        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
        });

        return recaptchaVerifierRef.current;
    };

    const handleGoogleLogin = async () => {
        if (!isFirebaseConfigured) {
            toast({
                title: 'Firebase auth not configured',
                description: 'Set VITE_FIREBASE_* values in frontend environment variables and redeploy.',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsLoadingGoogle(true);
            const user = await signInWithGoogle();

            if (!user) {
                toast({
                    title: 'Continuing sign-in',
                    description: 'Redirecting to complete Google login...'
                });
                return;
            }

            await syncProfile();
            toast({
                title: 'Signed in',
                description: 'Google account connected successfully.'
            });
            navigate('/account');
        } catch (error: any) {
            console.error('Google login failed:', error);
            toast({
                title: 'Google login failed',
                description: error?.message || 'Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingGoogle(false);
        }
    };

    const handleGuestLogin = async () => {
        if (!isFirebaseConfigured) {
            toast({
                title: 'Firebase auth not configured',
                description: 'Set VITE_FIREBASE_* values in frontend environment variables and redeploy.',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsLoadingGuest(true);
            await signInAsGuest();
            await syncProfile();
            toast({
                title: 'Guest login successful',
                description: 'You are signed in anonymously.'
            });
            navigate('/account');
        } catch (error: any) {
            console.error('Guest login failed:', error);
            toast({
                title: 'Guest login failed',
                description: error?.message || 'Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingGuest(false);
        }
    };

    const handleSendOtp = async () => {
        if (!isFirebaseConfigured) {
            toast({
                title: 'Firebase auth not configured',
                description: 'Set VITE_FIREBASE_* values in frontend environment variables and redeploy.',
                variant: 'destructive'
            });
            return;
        }

        try {
            if (!auth) {
                throw new Error('Firebase auth is not configured.');
            }

            if (!phone.trim()) {
                toast({
                    title: 'Phone number required',
                    description: 'Enter your number in E.164 format, e.g. +919876543210.',
                    variant: 'destructive'
                });
                return;
            }

            setIsSendingOtp(true);
            const appVerifier = getRecaptchaVerifier();
            const result = await signInWithPhoneNumber(auth, phone.trim(), appVerifier);
            setConfirmationResult(result);
            toast({
                title: 'OTP sent',
                description: 'Check your phone for the verification code.'
            });
        } catch (error: any) {
            console.error('Send OTP failed:', error);

            if (error?.code === 'auth/billing-not-enabled') {
                toast({
                    title: 'Phone auth needs billing or test numbers',
                    description: 'For development, add Firebase Auth test phone numbers. For production SMS, enable billing in Google Cloud.',
                    variant: 'destructive'
                });
                return;
            }

            if (error?.code === 'auth/operation-not-allowed') {
                toast({
                    title: 'Phone sign-in is not enabled',
                    description: 'Enable Phone provider in Firebase Authentication settings.',
                    variant: 'destructive'
                });
                return;
            }

            toast({
                title: 'Could not send OTP',
                description: error?.message || 'Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        try {
            if (!confirmationResult) {
                toast({
                    title: 'OTP not requested',
                    description: 'Send OTP first.',
                    variant: 'destructive'
                });
                return;
            }

            if (!otp.trim()) {
                toast({
                    title: 'Code required',
                    description: 'Enter the 6-digit OTP code.',
                    variant: 'destructive'
                });
                return;
            }

            setIsVerifyingOtp(true);
            await confirmationResult.confirm(otp.trim());
            await syncProfile();
            toast({
                title: 'Phone verified',
                description: 'You are signed in successfully.'
            });
            navigate('/account');
        } catch (error: any) {
            console.error('Verify OTP failed:', error);
            toast({
                title: 'OTP verification failed',
                description: error?.message || 'Please check the code and try again.',
                variant: 'destructive'
            });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#07050d] text-white selection:bg-brand-purple/30">
            <Helmet>
                <title>Login | RakshaMarg</title>
                <meta name="description" content="Sign in to RakshaMarg with Google, phone OTP, or anonymous access." />
            </Helmet>
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
            </div>

            <Navbar />

            <main className="relative z-10 min-h-screen px-4 pt-36 pb-20 sm:pt-40">
                <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-4xl flex-col items-center justify-center gap-6">
                    <div className="text-center">
                        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Login to RakshaMarg</h1>
                        <p className="mt-3 text-xs text-white/70 sm:text-sm">Use Google, phone OTP, or continue as guest.</p>
                    </div>

                    <Card className="w-full max-w-2xl border border-white/10 bg-white/10 text-white shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                        <CardHeader className="space-y-2 pb-5 pt-6 text-left sm:pt-7">
                            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Choose Login Method</CardTitle>
                            <p className="text-xs text-white/65 sm:text-sm">Your data syncs securely with your account.</p>
                        </CardHeader>

                        <CardContent className="space-y-5 pb-6">
                            {!isFirebaseConfigured ? (
                                <div className="rounded-md border border-amber-300/40 bg-amber-300/10 p-3 text-xs text-amber-100 sm:text-sm">
                                    Firebase auth is not configured in this deployment. Add all required VITE_FIREBASE_* variables in Vercel and redeploy.
                                </div>
                            ) : null}

                            <Tabs defaultValue="google" className="w-full">
                                <TabsList className="grid h-auto w-full grid-cols-3 rounded-md border border-white/10 bg-white/10 p-1">
                                <TabsTrigger
                                    value="google"
                                    className="rounded-[4px] text-xs sm:text-sm text-white/70 data-[state=active]:bg-[#0a0a12] data-[state=active]:text-white data-[state=active]:shadow-none"
                                >
                                    Google
                                </TabsTrigger>
                                <TabsTrigger
                                    value="phone"
                                    className="rounded-[4px] text-xs sm:text-sm text-white/70 data-[state=active]:bg-[#0a0a12] data-[state=active]:text-white data-[state=active]:shadow-none"
                                >
                                    Phone OTP
                                </TabsTrigger>
                                <TabsTrigger
                                    value="guest"
                                    className="rounded-[4px] text-xs sm:text-sm text-white/70 data-[state=active]:bg-[#0a0a12] data-[state=active]:text-white data-[state=active]:shadow-none"
                                >
                                    Guest
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="google" className="mt-4 space-y-4">
                                <p className="text-xs text-white/65 sm:text-sm">Fastest option for full account sync.</p>
                                <Button
                                    onClick={handleGoogleLogin}
                                    disabled={!isFirebaseConfigured || isLoadingGoogle}
                                    className="h-11 w-full rounded-md bg-white text-brand-dark hover:bg-brand-teal hover:text-white"
                                >
                                    {isLoadingGoogle ? 'Signing in...' : 'Continue with Google'}
                                </Button>
                            </TabsContent>

                            <TabsContent value="phone" className="mt-4 space-y-4">
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+919876543210"
                                    className="h-11 border-white/15 bg-white/8 text-white placeholder:text-white/40 focus-visible:ring-brand-teal"
                                />

                                <Button
                                    onClick={handleSendOtp}
                                    disabled={!isFirebaseConfigured || isSendingOtp}
                                    className="h-11 w-full rounded-md bg-brand-purple text-white hover:bg-brand-purple/90"
                                >
                                    {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                                </Button>

                                {confirmationResult ? (
                                    <>
                                        <Input
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="Enter OTP"
                                            className="h-11 border-white/15 bg-white/8 text-white placeholder:text-white/40 focus-visible:ring-brand-teal"
                                        />
                                        <Button
                                            onClick={handleVerifyOtp}
                                            disabled={!isFirebaseConfigured || isVerifyingOtp}
                                            className="h-11 w-full rounded-md bg-white text-brand-dark hover:bg-brand-teal hover:text-white"
                                        >
                                            {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                                        </Button>
                                    </>
                                ) : null}

                                <div id="recaptcha-container" />
                            </TabsContent>

                            <TabsContent value="guest" className="mt-4">
                                <Button
                                    onClick={handleGuestLogin}
                                    disabled={!isFirebaseConfigured || isLoadingGuest}
                                    className="h-11 w-full rounded-md bg-white text-brand-dark hover:bg-brand-teal hover:text-white"
                                >
                                    {isLoadingGuest ? 'Signing in...' : 'Continue as Guest'}
                                </Button>
                            </TabsContent>
                        </Tabs>

                        <p className="text-center text-[11px] leading-6 text-white/45 sm:text-xs">
                            By continuing, you agree to use this app responsibly for safety assistance.
                        </p>

                        <p className="text-center text-sm">
                            <Link to="/" className="text-brand-teal transition-colors hover:text-white">
                                Back to Home
                            </Link>
                        </p>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Login;
