import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Settings, User, LogOut, Palette } from "lucide-react";
import { SocialSecurityIcon } from "@/components/icons/SocialSecurityIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Header = () => {
  const { user, logout } = useAuth();
  const { currentTheme, setTheme, themes } = useTheme();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger 
          className="text-gray-600 hover:text-government-700" 
          style={{ color: currentTheme.colors.primary }}
        />
        <div className="flex items-center gap-3">
          <SocialSecurityIcon 
            size={32}
            className="text-government-600"
            style={{ color: currentTheme.colors.primary }}
          />
          <div className="flex flex-col">
            <h1 
              className="text-xl font-semibold tracking-tight"
              style={{ color: currentTheme.colors.text }}
            >
              SecureServe Portal
            </h1>
            <span className="text-sm text-gray-500 font-medium">
              Social Security Administration
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-gray-600"
          style={{ color: currentTheme.colors.primary }}
        >
          <Bell className="h-5 w-5" />
          <span 
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full text-xs flex items-center justify-center text-white"
            style={{ backgroundColor: currentTheme.colors.accent }}
          >
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt={user?.name || 'User'} />
                <AvatarFallback 
                  className="text-sm font-medium"
                  style={{ 
                    backgroundColor: `${currentTheme.colors.primary}20`,
                    color: currentTheme.colors.primary
                  }}
                >
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">{user?.name || 'Guest User'}</div>
                <div className="text-xs text-gray-500">{user?.role || 'Administrator'}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Guest User'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'admin@secureserve.gov'}</p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Palette className="mr-2 h-4 w-4" />
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-white border border-gray-200 shadow-lg">
                {Object.values(themes).map((theme) => (
                  <DropdownMenuItem
                    key={theme.name}
                    onClick={() => setTheme(theme.name)}
                    className={`cursor-pointer ${
                      currentTheme.name === theme.name 
                        ? 'bg-government-50 text-government-700' 
                        : ''
                    }`}
                    style={{
                      backgroundColor: currentTheme.name === theme.name 
                        ? `${theme.colors.primary}15` 
                        : 'transparent',
                      color: currentTheme.name === theme.name 
                        ? theme.colors.primary 
                        : 'inherit'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      {theme.label}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              System Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
