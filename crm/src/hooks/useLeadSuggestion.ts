import { useEffect, useRef, useState, useCallback } from 'react';
import type { Lead } from '@/hooks/useLeads';

interface UseLeadSuggestionOptions {
  intervalSeconds: number;
  enabled: boolean;
  pendingLeads: Lead[];
  isOnCall: boolean;
  playNudge: () => void;
}

/**
 * Every `intervalSeconds`, picks a random pending lead and suggests it.
 * Consolidates the old inactivity alert with a friendlier suggestion system.
 * Only fires when not on a call and there are pending leads.
 */
export function useLeadSuggestion({
  intervalSeconds,
  enabled,
  pendingLeads,
  isOnCall,
  playNudge,
}: UseLeadSuggestionOptions) {
  const [suggestedLead, setSuggestedLead] = useState<Lead | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggestedRef = useRef<string | null>(null);

  // Use refs for unstable deps to avoid timer resets
  const pendingLeadsRef = useRef(pendingLeads);
  pendingLeadsRef.current = pendingLeads;
  const playNudgeRef = useRef(playNudge);
  playNudgeRef.current = playNudge;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuggestedLead(null);

    if (!enabled || pendingLeads.length === 0 || isOnCall) return;

    timerRef.current = setTimeout(() => {
      const leads = pendingLeadsRef.current;
      if (leads.length === 0) return;
      const candidates = leads.filter(l => l.id !== lastSuggestedRef.current);
      const pool = candidates.length > 0 ? candidates : leads;
      const lead = pool[Math.floor(Math.random() * pool.length)];
      if (lead) {
        lastSuggestedRef.current = lead.id;
        setSuggestedLead(lead);
        playNudgeRef.current();
      }
    }, intervalSeconds * 1000);
  }, [enabled, pendingLeads.length, isOnCall, intervalSeconds]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const dismiss = useCallback(() => {
    setSuggestedLead(null);
    startTimer();
  }, [startTimer]);

  const reset = useCallback(() => {
    setSuggestedLead(null);
    startTimer();
  }, [startTimer]);

  return { suggestedLead, dismissSuggestion: dismiss, resetSuggestionTimer: reset };
}
