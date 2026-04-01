import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult
} from 'firebase/auth';
import {
    ArrowRight,
    CheckCircle2,
    Globe2,
    LockKeyhole,
    Sparkles,
    Smartphone,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

const highlights = [
    {
        icon: ShieldCheck,
        title: 'Secure identity',
        description: 'Firebase Authentication handles sign-in while MongoDB stores your profile data.',
    },
    {
        icon: Sparkles,
        title: 'Smooth sync',
        description: 'Trusted contacts and account details reappear automatically after login.',
    },
    {
        icon: Globe2,
        title: 'Flexible access',
        description: 'Use Google, phone OTP, or guest mode depending on what you need right now.',
    },
];

const steps = [
    'Choose a sign-in method',
    'Authenticate with Firebase',
    'Sync your profile to MongoDB',
];

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
        <div className="min-h-screen bg-[#05020b] text-white relative overflow-hidden selection:bg-brand-purple/30">
            <Helmet>
                <title>Login | RakshaMarg</title>
                <meta name="description" content="Sign in to RakshaMarg with Google, phone OTP, or anonymous access." />
            </Helmet>

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-28 left-[-8rem] h-72 w-72 rounded-full bg-brand-purple/20 blur-3xl" />
                <div className="absolute top-1/4 right-[-6rem] h-80 w-80 rounded-full bg-brand-teal/15 blur-3xl" />
                <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                        backgroundSize: '72px 72px',
                    }}
                />
            </div>

            <Navbar />

            <main className="relative z-10 container px-4 pt-28 pb-16 lg:pt-32 lg:pb-24">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <section className="space-y-8">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 backdrop-blur-xl">
                                <LockKeyhole className="h-4 w-4 text-brand-teal" />
                                Private sign-in. Automatic profile sync.
                            </div>

                            <div className="max-w-2xl space-y-5">
                                <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl xl:text-7xl">
                                    Welcome back to
                                    <span className="block bg-gradient-to-r from-white via-white to-brand-teal bg-clip-text text-transparent">
                                        RakshaMarg
                                    </span>
                                </h1>
                                <p className="max-w-xl text-base leading-7 text-white/68 sm:text-lg">
                                    Pick a sign-in method, secure your session with Firebase, and instantly restore your saved route data, trusted contacts, and profile details.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                {steps.map((step, index) => (
                                    <div
                                        key={step}
                                        className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                                    >
                                        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/15 text-sm font-semibold text-brand-teal">
                                            {index + 1}
                                        </div>
                                        <p className="text-sm leading-6 text-white/75">{step}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                {highlights.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={item.title}
                                            className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                                        >
                                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 ring-1 ring-white/10">
                                                <Icon className="h-5 w-5 text-brand-teal" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                                            <p className="mt-2 text-sm leading-6 text-white/60">{item.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="relative lg:pl-4">
                            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-purple/15 via-transparent to-brand-teal/10 blur-2xl" />
                            <Card className="relative overflow-hidden border-white/10 bg-white/[0.06] text-white shadow-[0_30px_90px_-35px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                                <CardHeader className="space-y-4 pb-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-2xl sm:text-3xl">Choose login method</CardTitle>
                                            <CardDescription className="mt-2 max-w-md text-white/60">
                                                Fast sign-in with a polished flow and automatic data restoration.
                                            </CardDescription>
                                        </div>
                                        <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-purple/15 ring-1 ring-white/10">
                                            <UserRound className="h-5 w-5 text-brand-teal" />
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    <Tabs defaultValue="google" className="w-full">
                                        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/25 p-1">
                                            <TabsTrigger
                                                value="google"
                                                className="rounded-xl py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-brand-dark data-[state=active]:shadow-lg"
                                            >
                                                Google
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="phone"
                                                className="rounded-xl py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-brand-dark data-[state=active]:shadow-lg"
                                            >
                                                Phone OTP
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="guest"
                                                className="rounded-xl py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-brand-dark data-[state=active]:shadow-lg"
                                            >
                                                Guest
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="google" className="mt-6 space-y-5">
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                                                        <ShieldCheck className="h-4 w-4 text-brand-teal" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">Fastest option for full account sync</p>
                                                        <p className="mt-1 text-sm leading-6 text-white/60">
                                                            Use your Google account to connect instantly and restore your profile data.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={handleGoogleLogin}
                                                disabled={isLoadingGoogle}
                                                className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-brand-dark transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-teal hover:text-white"
                                            >
                                                {isLoadingGoogle ? 'Signing in...' : 'Continue with Google'}
                                                {!isLoadingGoogle && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                                            </Button>
                                        </TabsContent>

                                        <TabsContent value="phone" className="mt-6 space-y-4">
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                                                        <Smartphone className="h-4 w-4 text-brand-teal" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">Verify with phone OTP</p>
                                                        <p className="mt-1 text-sm leading-6 text-white/60">
                                                            Enter your number in international format. In development, use Firebase test phone numbers if SMS billing is disabled.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <Input
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+919876543210"
                                                className="h-12 rounded-2xl border-white/10 bg-black/25 text-white placeholder:text-white/35 focus-visible:ring-brand-teal"
                                            />
                                            <Button
                                                onClick={handleSendOtp}
                                                disabled={isSendingOtp}
                                                className="h-12 w-full rounded-2xl bg-brand-purple text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-purple/85"
                                            >
                                                {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                                            </Button>

                                            {confirmationResult ? (
                                                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                                                    <Input
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value)}
                                                        placeholder="Enter 6-digit OTP"
                                                        className="h-12 rounded-2xl border-white/10 bg-black/25 text-white placeholder:text-white/35 focus-visible:ring-brand-teal"
                                                    />
                                                    <Button
                                                        onClick={handleVerifyOtp}
                                                        disabled={isVerifyingOtp}
                                                        className="h-12 w-full rounded-2xl bg-white text-brand-dark transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-teal hover:text-white"
                                                    >
                                                        {isVerifyingOtp ? 'Verifying...' : 'Verify OTP & Login'}
                                                    </Button>
                                                </div>
                                            ) : null}

                                            <div id="recaptcha-container" />
                                        </TabsContent>

                                        <TabsContent value="guest" className="mt-6 space-y-5">
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                                                        <Globe2 className="h-4 w-4 text-brand-teal" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">Temporary access without a profile</p>
                                                        <p className="mt-1 text-sm leading-6 text-white/60">
                                                            Good for quick testing. Your data will stay local unless you sign in later.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={handleGuestLogin}
                                                disabled={isLoadingGuest}
                                                className="h-12 w-full rounded-2xl bg-white text-brand-dark transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-teal hover:text-white"
                                            >
                                                {isLoadingGuest ? 'Signing in...' : 'Continue as Guest'}
                                            </Button>
                                        </TabsContent>
                                    </Tabs>

                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55">
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-brand-teal" />
                                            Trusted contacts sync automatically after login
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-brand-teal" />
                                            Secure profile storage in MongoDB
                                        </span>
                                    </div>

                                    <p className="text-center text-xs leading-6 text-white/45">
                                        By continuing, you agree to use this app responsibly for safety assistance.
                                    </p>

                                    <p className="text-center text-sm">
                                        <Link
                                            to="/"
                                            className="inline-flex items-center gap-2 text-brand-teal transition-colors hover:text-white"
                                        >
                                            Back to Home
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </p>
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Login;
