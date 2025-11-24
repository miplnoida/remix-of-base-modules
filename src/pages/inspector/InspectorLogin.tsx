import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, MapPin } from 'lucide-react';

export const InspectorLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && (user.role === 'field_inspector' || user.role === 'compliance_senior_inspector')) {
      navigate('/inspector/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      
      if (success) {
        // Will redirect via useEffect
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const inspectorCredentials = [
    { email: 'field.inspector@ssb.kn', name: 'Michael Johnson', role: 'Field Inspector' },
    { email: 'senior.inspector@ssb.kn', name: 'Patricia Davis', role: 'Senior Inspector' }
  ];

  if (user && (user.role === 'field_inspector' || user.role === 'compliance_senior_inspector')) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center p-4">
        <div className="text-center">
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex flex-col items-center justify-center p-3">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-card rounded-full flex items-center justify-center p-2 shadow-xl border-4 border-primary/20">
            <img 
              src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
              alt="SSB Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              SSB Field Inspector
            </h1>
            <p className="text-muted-foreground text-xs">Compliance & Inspection Portal</p>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-lg text-center">Inspector Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="inspector@ssb.kn"
                  required
                  className="h-10"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="h-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-10" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Demo Inspector Accounts:</p>
              <div className="space-y-2">
                {inspectorCredentials.map((cred, index) => (
                  <div 
                    key={index} 
                    className="text-xs bg-muted/50 p-2.5 rounded-lg cursor-pointer hover:bg-muted transition-colors" 
                    onClick={() => setEmail(cred.email)}
                  >
                    <div className="font-medium">{cred.name}</div>
                    <div className="text-xs text-muted-foreground">{cred.role}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{cred.email}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Password: password123</p>
            </div>

            <div className="mt-3 text-center">
              <Button
                variant="link"
                className="text-xs h-auto p-0"
                onClick={() => navigate('/login')}
              >
                ← Back to Main Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
