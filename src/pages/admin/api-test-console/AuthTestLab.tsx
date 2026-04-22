import { useState } from 'react';
import ConsoleLayout from './ConsoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LockKeyhole, PlayCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTestContext, setLastTokens, getLastAccessToken, getLastRefreshToken } from './useTestContext';
import { useTestRunner } from './useTestRunner';
import ResponseInspector from './ResponseInspector';

type AuthTab = 'login' | 'set-pin' | 'pin-unlock' | 'refresh' | 'logout';

export default function AuthTestLab() {
  const ctx = useTestContext();
  const { run, isRunning, lastResult } = useTestRunner();
  const [tab, setTab] = useState<AuthTab>('login');
  const [requestPreview, setRequestPreview] = useState<any>(null);

  // Login form
  const [email, setEmail] = useState('admin@secureserve.gov');
  const [password, setPassword] = useState('Admin@123');
  const [deviceId, setDeviceId] = useState('console-test-device');
  const [deviceName, setDeviceName] = useState('API Test Console');
  // PIN
  const [pin, setPin] = useState('1234');
  // Tokens
  const [accessToken, setAccessToken] = useState(getLastAccessToken() || '');
  const [refreshToken, setRefreshToken] = useState(getLastRefreshToken() || '');
  const [includeApiKey, setIncludeApiKey] = useState(true);

  const execute = async (path: string, body: any, expectedStatus = 200, withBearer = false) => {
    if (!ctx.env) { toast.error('No environment selected'); return; }
    const apiKey = includeApiKey ? await ctx.getApiKeyPlaintext() : null;
    if (includeApiKey && !apiKey) { toast.error('Could not resolve API key plaintext'); return; }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (withBearer && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const url = `${ctx.env.edge_functions_url}${path}`;
    setRequestPreview({ method: 'POST', url, headers, body });

    const r = await run({ method: 'POST', url, headers, body, expectedStatus, testName: `Auth: ${tab}`, environmentId: ctx.env.id, apiKeyId: ctx.selectedKeyId });

    // Auto-capture tokens from login/refresh/pin-unlock
    if (r.result === 'pass' && r.responseBody && typeof r.responseBody === 'object') {
      const at = r.responseBody.access_token;
      const rt = r.responseBody.refresh_token;
      if (at) { setAccessToken(at); setLastTokens(at, rt); toast.success('Access token captured'); }
      if (rt) setRefreshToken(rt);
    }
  };

  return (
    <ConsoleLayout>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5" />
                <CardTitle className="text-base">Auth Test Lab</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Label className="text-xs">X-API-Key</Label>
                <input type="checkbox" checked={includeApiKey} onChange={(e) => setIncludeApiKey(e.target.checked)} />
              </div>
            </div>
            {ctx.env && <p className="text-xs text-muted-foreground">Target: <code>{ctx.env.edge_functions_url}</code></p>}
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as AuthTab)}>
              <TabsList>
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="set-pin">Set PIN</TabsTrigger>
                <TabsTrigger value="pin-unlock">PIN unlock</TabsTrigger>
                <TabsTrigger value="refresh">Refresh</TabsTrigger>
                <TabsTrigger value="logout">Logout</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-3 pt-3">
                <FormField label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
                <FormField label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>
                <FormField label="Device ID"><Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} /></FormField>
                <FormField label="Device name"><Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} /></FormField>
                <Button disabled={isRunning} onClick={() => execute('/compliance-mobile-auth/login', { email, password, device_id: deviceId, device_name: deviceName, platform: 'web', app_version: '1.0.0' }, 200)}>
                  <PlayCircle className="mr-1 h-4 w-4" /> Run login
                </Button>
              </TabsContent>

              <TabsContent value="set-pin" className="space-y-3 pt-3">
                <FormField label="Device ID"><Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} /></FormField>
                <FormField label="PIN"><Input value={pin} onChange={(e) => setPin(e.target.value)} /></FormField>
                <Button disabled={isRunning || !accessToken} onClick={() => execute('/compliance-mobile-auth/set-pin', { device_id: deviceId, pin }, 200, true)}>
                  <PlayCircle className="mr-1 h-4 w-4" /> Run set-pin
                </Button>
                {!accessToken && <p className="text-xs text-destructive">Run login first to capture an access token.</p>}
              </TabsContent>

              <TabsContent value="pin-unlock" className="space-y-3 pt-3">
                <FormField label="Device ID"><Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} /></FormField>
                <FormField label="PIN"><Input value={pin} onChange={(e) => setPin(e.target.value)} /></FormField>
                <Button disabled={isRunning} onClick={() => execute('/compliance-mobile-auth/pin-unlock', { device_id: deviceId, pin }, 200)}>
                  <PlayCircle className="mr-1 h-4 w-4" /> Run pin-unlock
                </Button>
              </TabsContent>

              <TabsContent value="refresh" className="space-y-3 pt-3">
                <FormField label="Refresh token"><Input value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} /></FormField>
                <Button disabled={isRunning || !refreshToken} onClick={() => execute('/compliance-mobile-auth/refresh', { refresh_token: refreshToken }, 200)}>
                  <PlayCircle className="mr-1 h-4 w-4" /> Run refresh
                </Button>
              </TabsContent>

              <TabsContent value="logout" className="space-y-3 pt-3">
                <FormField label="Device ID"><Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} /></FormField>
                <Button disabled={isRunning || !accessToken} onClick={() => execute('/compliance-mobile-auth/logout', { device_id: deviceId }, 200, true)}>
                  <PlayCircle className="mr-1 h-4 w-4" /> Run logout
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-4 space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold">Captured tokens (session)</p>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">access</Badge>
                <code className="flex-1 truncate font-mono">{accessToken ? `${accessToken.slice(0, 28)}…` : '—'}</code>
                {accessToken && <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(accessToken); toast.success('Copied'); }}><Copy className="h-3 w-3" /></Button>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">refresh</Badge>
                <code className="flex-1 truncate font-mono">{refreshToken ? `${refreshToken.slice(0, 28)}…` : '—'}</code>
                {refreshToken && <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(refreshToken); toast.success('Copied'); }}><Copy className="h-3 w-3" /></Button>}
              </div>
            </div>
          </CardContent>
        </Card>

        <ResponseInspector result={lastResult} requestPreview={requestPreview} expectedStatus={200} />
      </div>
    </ConsoleLayout>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
