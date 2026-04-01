import React, { useState, useEffect } from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, type To } from 'react-router-dom';
import { observeAuthState, signOutUser } from '@/lib/firebaseAuth';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import logo from '@/assets/logo.png';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [authUser, setAuthUser] = useState<{ name: string; email: string; photoURL: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {

      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      if (!user) {
        setAuthUser(null);
        return;
      }

      setAuthUser({
        name: user.displayName || (user.isAnonymous ? 'Guest User' : 'User'),
        email: user.email || '',
        photoURL: user.photoURL || ''
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await signOutUser();
      toast({
        title: 'Signed out',
        description: 'You have been logged out.'
      });
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        title: 'Sign-out failed',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const navItems: Array<{ name: string; to: To }> = [
    { name: 'Home', to: '/' },
    { name: 'Check Route', to: '/check-route' },
    { name: 'How It Works', to: { pathname: '/', hash: '#how-it-works' } },
    { name: 'Inspiration', to: '/inspiration' },
  ];

  const accountNavItems = authUser
    ? [...navItems, { name: 'My Account', to: '/account' }]
    : navItems;

  const avatarFallback = authUser?.name?.slice(0, 1).toUpperCase() || 'U';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-[padding] duration-500 ${isScrolled ? 'py-4' : 'py-6'
      }`}>
      <div className="container px-4">
        <div className={`mx-auto max-w-7xl rounded-full transition-colors duration-500 px-6 h-16 flex items-center justify-between ${isScrolled
          ? 'bg-[#0b0614]/80 backdrop-blur-xl border border-white/10 shadow-lg'
          : 'bg-transparent'
          }`}>


          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
            <span className="font-display text-xl font-bold text-white">
              Raksha<span className="text-brand-purple">Marg</span>
            </span>
          </Link>


          <div className="hidden xl:flex items-center gap-8">
            {accountNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.to}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>


          <div className="hidden xl:flex items-center gap-3">
            {authUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-11 rounded-full px-2 text-white hover:bg-white/10"
                    disabled={isAuthLoading}
                  >
                    <Avatar className="h-8 w-8 mr-2 border border-white/20">
                      <AvatarImage src={authUser.photoURL} alt={authUser.name} />
                      <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>
                    <span className="max-w-[120px] truncate">{authUser.name}</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="space-y-1">
                    <p className="font-medium leading-none">{authUser.name}</p>
                    <p className="text-xs text-muted-foreground font-normal break-all">{authUser.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account">My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    {isAuthLoading ? 'Please wait...' : 'Logout'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button
                  className="bg-white text-brand-dark hover:bg-brand-teal hover:text-white font-semibold rounded-full px-6 transition-all duration-300"
                >
                  Login
                </Button>
              </Link>
            )}

            <a
              href="https://dna-coded.github.io/About_DNA_Coded/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-brand-purple text-white hover:bg-brand-teal hover:text-brand-dark font-semibold rounded-full px-6 transition-all duration-300">
                About Us
              </Button>
            </a>
          </div>


          <div className="xl:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-[300px] bg-[#0a0a0a] border-r border-white/10 text-white z-[100]">
                <SheetHeader className="mb-8 text-left">
                  <SheetTitle>
                    <Link to="/" className="flex items-center gap-3">
                      <img
                        src={logo}
                        alt="Logo"
                        className="h-10 w-auto object-contain"
                      />
                      <span className="font-display text-xl font-bold text-white">
                        Raksha<span className="text-brand-purple">Marg</span>
                      </span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-6">
                  {accountNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-lg font-medium text-white/70 hover:text-brand-purple transition-colors"
                    >
                      {item.name}
                    </Link>
                  ))}
                  <a
                    href="https://dna-coded.github.io/About-Us/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4"
                  >
                    <Button className="w-full bg-brand-purple text-white hover:bg-brand-teal hover:text-brand-dark font-semibold rounded-lg py-6 transition-all duration-300">
                      About Us
                    </Button>
                  </a>

                  {authUser ? (
                    <Button
                      onClick={handleSignOut}
                      disabled={isAuthLoading}
                      className="w-full bg-white text-brand-dark hover:bg-brand-teal hover:text-white font-semibold rounded-lg py-6 transition-all duration-300"
                    >
                      {isAuthLoading ? 'Please wait...' : 'Logout'}
                    </Button>
                  ) : (
                    <Link to="/login">
                      <Button
                        className="w-full bg-white text-brand-dark hover:bg-brand-teal hover:text-white font-semibold rounded-lg py-6 transition-all duration-300"
                      >
                        Login
                      </Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
