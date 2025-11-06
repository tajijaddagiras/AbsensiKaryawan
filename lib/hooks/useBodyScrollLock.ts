'use client';

import { useEffect } from 'react';

/**
 * Hook to lock/unlock body scroll when modal is open
 * Prevents background scrolling and layout issues on mobile devices
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Lock body scroll
      document.body.classList.add('body-scroll-locked');
      
      // Restore scroll position (prevent jump to top)
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        // Unlock body scroll
        document.body.classList.remove('body-scroll-locked');
        
        // Restore scroll position
        const savedScrollY = document.body.style.top;
        document.body.style.top = '';
        
        if (savedScrollY) {
          window.scrollTo(0, parseInt(savedScrollY || '0') * -1);
        }
      };
    }
  }, [isLocked]);
}

