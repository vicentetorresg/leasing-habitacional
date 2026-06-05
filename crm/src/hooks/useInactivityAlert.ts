import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInactivityAlertOptions {
  timeoutSeconds: number;
  enabled: boolean;
  hasPendingLeads: boolean;
  isOnCall: boolean;
  playAlert: (times?: number) => void;
}

export function useInactivityAlert({
  timeoutSeconds,
  enabled,
  hasPendingLeads,
  isOnCall,
  playAlert,
}: UseInactivityAlertOptions) {
  const [showPopup, setShowPopup] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setShowPopup(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled || !hasPendingLeads || isOnCall) return;

    timerRef.current = setTimeout(() => {
      setShowPopup(true);
      playAlert(3);
    }, timeoutSeconds * 1000);
  }, [enabled, hasPendingLeads, isOnCall, timeoutSeconds, playAlert]);

  // Reset timer on mount and when deps change
  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  const dismiss = useCallback(() => {
    setShowPopup(false);
    resetTimer();
  }, [resetTimer]);

  return { showInactivityPopup: showPopup, dismissInactivity: dismiss, resetInactivityTimer: resetTimer };
}
