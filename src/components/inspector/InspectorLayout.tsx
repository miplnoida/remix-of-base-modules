import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu, 
  Home, 
  Calendar, 
  MapPin, 
  FileText, 
  LogOut,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export const InspectorLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/inspector/login');
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/inspector/dashboard' },
    { icon: Calendar, label: 'Weekly Plan', path: '/inspector/plan' },
    { icon: MapPin, label: 'Field Activities', path: '/inspector/activities' },
    { icon: FileText, label: 'Violations', path: '/inspector/violations' },
    { icon: CheckSquare, label: 'Reports', path: '/inspector/reports' },
  ];

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {menuItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          className="w-full justify-start gap-2.5 h-11 text-sm"
          onClick={() => {
            navigate(item.path);
            onClick?.();
          }}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Button>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <img 
                          src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
                          alt="SSB Logo" 
                          className="w-5 h-5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-sm truncate">SSB Inspector</h2>
                        <p className="text-xs text-muted-foreground truncate">{user?.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="flex-1 p-3 space-y-1">
                    <NavItems onClick={() => setMobileMenuOpen(false)} />
                  </nav>

                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-11"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <h1 className="font-semibold text-base">Field Inspector</h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="md:hidden h-9 w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 py-4 pb-20 max-w-2xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
