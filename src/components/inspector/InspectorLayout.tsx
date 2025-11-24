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
          className="w-full justify-start gap-3 h-12"
          onClick={() => {
            navigate(item.path);
            onClick?.();
          }}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Button>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <img 
                          src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
                          alt="SSB Logo" 
                          className="w-6 h-6"
                        />
                      </div>
                      <div>
                        <h2 className="font-semibold text-sm">SSB Inspector</h2>
                        <p className="text-xs text-muted-foreground">{user?.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="flex-1 p-4 space-y-1">
                    <NavItems onClick={() => setMobileMenuOpen(false)} />
                  </nav>

                  <div className="p-4 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">Field Inspector</h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="md:hidden"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto p-4 pb-20">
        <Outlet />
      </main>
    </div>
  );
};
