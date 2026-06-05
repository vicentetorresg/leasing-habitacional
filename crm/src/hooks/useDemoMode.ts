import { useAuth } from '@/hooks/useAuth';

const DEMO_EMAIL = 'demo@demo.cl';

export function useDemoMode() {
  const { user } = useAuth();
  const isDemo = user?.email === DEMO_EMAIL;
  return { isDemo };
}
