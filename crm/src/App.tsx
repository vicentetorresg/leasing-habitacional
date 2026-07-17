import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import IncomingCallPopup from "@/components/IncomingCallPopup";
import { supabase } from "@/integrations/supabase/client";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Executive from "./pages/Executive";
import Admin from "./pages/Admin";
import Backoffice from "./pages/Backoffice";
import Advisor from "./pages/Advisor";
import Dialer from "./pages/Dialer";
import NotFound from "./pages/NotFound";
import Demo from "./pages/Demo";
import MailingOportunidad from "./pages/MailingOportunidad";
import Viviendas from "./pages/Viviendas";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">🚨</div>
          <p className="text-muted-foreground font-bold">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve ?fotos= deep-link param before redirecting to login
    const fotosParam = new URLSearchParams(window.location.search).get('fotos');
    if (fotosParam) sessionStorage.setItem('pending_fotos', fotosParam);
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Still loading role — show spinner instead of "Sin acceso" flash
  if (role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">🚨</div>
          <p className="text-muted-foreground font-bold">Cargando...</p>
        </div>
      </div>
    );
  }

  // admin/demo → executive first; asesor → advisor; dialer → dialer; ejecutiva → executive
  const defaultRoute = role === 'asesor' ? '/advisor' : role === 'dialer' ? '/dialer' : '/executive';
  // If there's a pending fotos deep-link, redirect to viviendas after login
  const pendingFotos = sessionStorage.getItem('pending_fotos');
  const loginRedirect = pendingFotos ? '/viviendas' : defaultRoute;

  return (
    <>
      <IncomingCallPopup userId={user.id} />
      <Routes>
        <Route path="/" element={<Navigate to={loginRedirect} replace />} />
        <Route path="/login" element={<Navigate to={loginRedirect} replace />} />
        <Route path="/executive" element={role === 'asesor' ? <Navigate to="/advisor" replace /> : <Executive />} />
        <Route path="/admin" element={role === 'admin' ? <Admin /> : <Navigate to={defaultRoute} replace />} />
        <Route path="/backoffice" element={role === 'admin' ? <Backoffice /> : <Navigate to={defaultRoute} replace />} />
        <Route path="/advisor" element={role === 'asesor' || role === 'admin' || role === 'ejecutiva' || role === 'recicladora' ? <Advisor /> : <Navigate to={defaultRoute} replace />} />
        <Route path="/dialer" element={role === 'dialer' || role === 'admin' ? <Dialer /> : <Navigate to={defaultRoute} replace />} />
        <Route path="/viviendas" element={role === 'asesor' ? <Navigate to={defaultRoute} replace /> : <Viviendas />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/mailing-oportunidad" element={<MailingOportunidad />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/crm">
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
