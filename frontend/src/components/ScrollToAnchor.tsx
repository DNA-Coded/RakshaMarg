import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLenis } from '@studio-freight/react-lenis';

const ScrollToAnchor = () => {
  const { pathname, hash } = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (hash) {
      const id = hash.replace('#', '');
      const scrollToAnchor = () => {
        const element = document.getElementById(id);

        if (!element) {
          return;
        }

        if (lenis) {
          lenis.scrollTo(element, {
            offset: -64,
            duration: 1.1,
          });
        } else {
          const targetTop = element.getBoundingClientRect().top + window.scrollY - 64;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        }
      };

      const firstFrame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(scrollToAnchor);
      });

      return () => window.cancelAnimationFrame(firstFrame);
    }

    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname, hash, lenis]);

  return null;
};

export default ScrollToAnchor;