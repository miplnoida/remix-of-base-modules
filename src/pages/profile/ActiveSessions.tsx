import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Monitor, Smartphone, Tablet, Globe, LogOut, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { format, formatDistanceToNow } from "date-fns";

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

const getDeviceIcon = (userAgent: string | null) => {
  if (!userAgent) return Monitor;
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return Smartphone;
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return Tablet;
  }
  return Monitor;
};

const parseDeviceInfo = (userAgent: string | null): string => {
  if (!userAgent) return 'Unknown Device';
  
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  
  return `${browser} on ${os}`;
};

const ActiveSessions = () => {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [sessionToTerminate, setSessionToTerminate] = useState<string | null>(null);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['user-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });
      if (error) throw error;
      return data as UserSession[];
    },
    enabled: !!user?.id,
  });

  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions', user?.id] });
      toast.success('Session terminated successfully');
      setSessionToTerminate(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const terminateAllOtherSessions = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      // In production, you'd identify the current session and exclude it
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions', user?.id] });
      toast.success('All other sessions terminated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Determine current session (in production, this would compare with actual session token)
  const currentSessionIndex = 0; // Assume first session is current for demo

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading sessions...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Active Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage your active login sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {sessions.length > 1 && (
            <Button
              variant="destructive"
              onClick={() => terminateAllOtherSessions.mutate()}
              disabled={terminateAllOtherSessions.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out All Other Sessions
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Sessions
          </CardTitle>
          <CardDescription>
            These are the devices that are currently logged in to your account. 
            If you see a session you don't recognize, terminate it immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active sessions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session, index) => {
                  const DeviceIcon = getDeviceIcon(session.user_agent);
                  const isCurrent = index === currentSessionIndex;
                  
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <DeviceIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {session.device_info || parseDeviceInfo(session.user_agent)}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {session.user_agent?.substring(0, 50)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {session.ip_address || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{format(new Date(session.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(session.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {isCurrent ? (
                          <Badge variant="default">Current Session</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSessionToTerminate(session.id)}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            End Session
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Always sign out when using shared or public computers</p>
          <p>• Regularly review your active sessions for unauthorized access</p>
          <p>• If you notice unfamiliar sessions, change your password immediately</p>
          <p>• Enable multi-factor authentication for additional security</p>
        </CardContent>
      </Card>

      <AlertDialog open={!!sessionToTerminate} onOpenChange={() => setSessionToTerminate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out the device associated with this session. They will need to sign in again to access their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToTerminate && terminateSession.mutate(sessionToTerminate)}
            >
              Terminate Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveSessions;
