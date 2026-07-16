import { useAuth } from '@/hooks/useAuth';
import { NavLink } from '@/components/NavLink';
import UserMenu from '@/components/UserMenu';
import ViviendaList from '@/components/ViviendaList';

const Viviendas = () => {
  const { user, role, fullName, signOut } = useAuth();
  const roleLabel = role === 'admin' ? 'CEO' : role === 'ejecutiva' ? 'Telemarketing' : role === 'asesor' ? 'Asesor Inmobiliario' : role === 'recicladora' ? 'Recicladora' : '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black tracking-tight text-foreground">Viviendas</h1>
          <span className="text-xs text-muted-foreground font-medium">Llave Propia</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/executive" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Leads
          </NavLink>
          <NavLink to="/advisor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Seguimiento
          </NavLink>
          <UserMenu
            fullName={fullName}
            email={user?.email ?? ''}
            roleLabel={roleLabel}
            onSignOut={signOut}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-3">
        <div style={{ height: 'calc(100vh - 70px)' }}>
          <ViviendaList />
        </div>
      </div>
    </div>
  );
};

export default Viviendas;
