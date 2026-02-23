'use client';

// ============================================================
// ONLINE DETECTOR - Monitors connectivity
// ============================================================

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function OnlineDetector() {
  const setIsOnline = useAppStore((s) => s.setIsOnline);
  const unsyncedQueue = useAppStore((s) => s.unsyncedQueue);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when back online
      if (unsyncedQueue.length > 0) {
        // Dispatch custom event that other components can listen to
        window.dispatchEvent(new CustomEvent('fitness:sync-queue'));
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, unsyncedQueue.length]);

  return null;
}
