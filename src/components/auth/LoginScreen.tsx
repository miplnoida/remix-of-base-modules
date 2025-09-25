
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    console.log('LoginScreen useEffect - user:', user);
    if (user) {
      console.log('User is logged in, redirecting to dashboard');
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    console.log('Form submitted, attempting login...');

    try {
      const success = await login(email, password);
      console.log('Login result:', success);
      
      if (success) {
        console.log('Login successful, should redirect automatically via useEffect');
        // The useEffect will handle the redirect when user state updates
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

  const demoCredentials = [
    { email: 'admin@secureserve.gov', role: 'System Administrator' },
    { email: 'accounts@secureserve.gov', role: 'Accounts Manager' },
    { email: 'cashier@secureserve.gov', role: 'Cashier Officer' },
    { email: 'supervisor@secureserve.gov', role: 'Cashier Supervisor' },
    { email: 'hr@secureserve.gov', role: 'HR Manager' },
    { email: 'compliance@secureserve.gov', role: 'Compliance Officer' },
    { email: 'benefits@secureserve.gov', role: 'Benefits Manager' },
    { email: 'legal@secureserve.gov', role: 'Legal Officer' }
  ];

  // Don't render login form if user is already authenticated
  if (user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-emerald-200 via-emerald-100 to-emerald-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="text-center">
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-200 via-emerald-100 to-emerald-50 flex items-center justify-center p-4 sm:p-6 md:p-8 m-0">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center p-2 shadow-lg">
            <img 
              src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
              alt="SecureServe Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-emerald-800">SecureServe</h1>
            <p className="text-emerald-700">Social Security Management System</p>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-3">Demo Credentials (password: password123):</p>
              <div className="space-y-2">
                {demoCredentials.map((cred, index) => (
                  <div key={index} className="text-xs bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100" 
                       onClick={() => setEmail(cred.email)}>
                    <div className="font-medium">{cred.role}</div>
                    <div className="text-gray-600">{cred.email}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Click on any credential above to auto-fill the email field</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
