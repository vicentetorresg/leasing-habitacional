import { User, LogOut, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  fullName: string;
  email: string;
  roleLabel?: string;
  onSignOut: () => void;
  executiveEditorMode?: boolean;
  onToggleExecutiveEditorMode?: () => void;
}

const UserMenu = ({ fullName, email, roleLabel, onSignOut, executiveEditorMode, onToggleExecutiveEditorMode }: UserMenuProps) => {
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:bg-accent p-1 transition-colors focus:outline-none">
          <Avatar className={`h-8 w-8 cursor-pointer ring-2 transition-all ${executiveEditorMode ? 'ring-orange-400' : 'ring-transparent'}`}>
            <AvatarFallback className={`text-xs font-bold transition-colors ${executiveEditorMode ? 'bg-orange-400 text-white' : 'bg-primary text-primary-foreground'}`}>
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            {roleLabel && (
              <p className="text-xs font-medium leading-none text-primary">{roleLabel}</p>
            )}
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onToggleExecutiveEditorMode && (
          <>
            <DropdownMenuItem onClick={onToggleExecutiveEditorMode} className="cursor-pointer">
              <Pencil className="mr-2 h-4 w-4 text-orange-400" />
              <span className={executiveEditorMode ? 'text-orange-400 font-semibold' : ''}>
                {executiveEditorMode ? 'Desactivar modo editor' : 'Modo editor ejecutiva'}
              </span>
              {executiveEditorMode && <span className="ml-auto text-[10px] bg-orange-400 text-white rounded px-1">ON</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
