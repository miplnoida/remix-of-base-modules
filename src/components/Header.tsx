
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Header = () => {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-government-100 text-government-800';
      case 'hr_manager': return 'bg-blue-100 text-blue-800';
      case 'compliance_officer': return 'bg-red-100 text-red-800';
      case 'benefits_manager': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'hr_manager': return 'HR Manager';
      case 'compliance_officer': return 'Compliance Officer';
      case 'benefits_manager': return 'Benefits Manager';
      case 'financial_analyst': return 'Financial Analyst';
      default: return 'User';
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 h-full">
        {/* Left side - Title */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              Welcome back, {user?.name}
            </p>
          </div>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2">
                <Avatar className="h-9 w-9 ring-2 ring-gray-200">
                  <AvatarFallback className="bg-gradient-to-r from-government-500 to-government-600 text-white font-semibold text-sm">
                    {user ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
                  <Badge className={`text-xs font-medium ${getRoleColor(user?.role || '')}`}>
                    {getRoleLabel(user?.role || '')}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-lg border border-gray-200">
              <DropdownMenuLabel className="font-semibold">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 hover:bg-gray-50">
                <User className="h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 hover:bg-gray-50">
                <Settings className="h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout} 
                className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
