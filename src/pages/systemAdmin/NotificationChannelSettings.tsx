/**
 * @deprecated Mock-backed channel settings — retained temporarily for
 * bookmark compatibility only. The real, database-backed provider and
 * channel configuration lives at /admin/notifications/providers
 * (ProviderSettings). Scheduled for removal once Provider Settings covers
 * every channel currently shown here.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, MessageSquare, Bell, Save, TestTube, Settings, ChevronDown, ExternalLink } from "lucide-react";
import { channelConfigurations } from "@/services/mockData/notificationData";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function NotificationChannelSettings() {
  const { toast } = useToast();
  const [emailConfig, setEmailConfig] = useState(channelConfigurations.find(c => c.channel === 'Email')!);
  const [smsConfig, setSmsConfig] = useState(channelConfigurations.find(c => c.channel === 'SMS')!);
  const [pushConfig, setPushConfig] = useState(channelConfigurations.find(c => c.channel === 'Push')!);

  const testChannel = (channel: string) => {
    toast({
      title: "Test Message Sent",
      description: `Test ${channel} notification has been queued for delivery.`,
    });
  };

  const saveConfig = (channel: string) => {
    toast({
      title: "Configuration Saved",
      description: `${channel} channel configuration has been updated successfully.`,
    });
  };

  const [showLegacy, setShowLegacy] = useState(false);
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Channel Configuration <Badge variant="outline" className="ml-2 align-middle">Deprecated</Badge></h1>
          <p className="text-muted-foreground">Legacy mock UI — retained for bookmark compatibility only.</p>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>This page is deprecated (mock data only)</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            All values shown below are static mock data and are not persisted. The real,
            database-backed channel and provider configuration lives at Provider Settings.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/notifications/providers">
              Go to Provider Settings <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>

      <Collapsible open={showLegacy} onOpenChange={setShowLegacy}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${showLegacy ? "rotate-180" : ""}`} />
            {showLegacy ? "Hide" : "Show"} legacy mock UI
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">

      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <p className="font-semibold">Email</p>
                </div>
                <Badge className={emailConfig.isEnabled ? "bg-green-100 text-green-800 mt-2" : "bg-gray-100 text-gray-800 mt-2"}>
                  {emailConfig.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{emailConfig.dailyLimit?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Daily Limit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <p className="font-semibold">SMS</p>
                </div>
                <Badge className={smsConfig.isEnabled ? "bg-green-100 text-green-800 mt-2" : "bg-gray-100 text-gray-800 mt-2"}>
                  {smsConfig.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{smsConfig.dailyLimit?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Daily Limit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-purple-600" />
                  <p className="font-semibold">Push</p>
                </div>
                <Badge className={pushConfig.isEnabled ? "bg-green-100 text-green-800 mt-2" : "bg-gray-100 text-gray-800 mt-2"}>
                  {pushConfig.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{pushConfig.dailyLimit?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Daily Limit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="email">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS Settings
          </TabsTrigger>
          <TabsTrigger value="push">
            <Bell className="mr-2 h-4 w-4" />
            Push Settings
          </TabsTrigger>
        </TabsList>

        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Channel Configuration</CardTitle>
              <CardDescription>Configure SMTP or email service provider settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Allow sending notifications via email</p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={emailConfig.isEnabled}
                  onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, isEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select value={emailConfig.emailProvider} onValueChange={(value) => setEmailConfig({ ...emailConfig, emailProvider: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Resend">Resend</SelectItem>
                    <SelectItem value="SendGrid">SendGrid</SelectItem>
                    <SelectItem value="AWS_SES">AWS SES</SelectItem>
                    <SelectItem value="SMTP">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Address</Label>
                  <Input
                    value={emailConfig.fromAddress}
                    onChange={(e) => setEmailConfig({ ...emailConfig, fromAddress: e.target.value })}
                    placeholder="notifications@ssb.gov.kn"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={emailConfig.fromName}
                    onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                    placeholder="Social Security Board"
                  />
                </div>
              </div>

              {emailConfig.emailProvider === 'SMTP' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        value={emailConfig.smtpHost}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        type="number"
                        value={emailConfig.smtpPort}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: parseInt(e.target.value) })}
                        placeholder="587"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Username</Label>
                    <Input
                      value={emailConfig.smtpUsername}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpUsername: e.target.value })}
                      placeholder="username"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={emailConfig.smtpUseTLS}
                      onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, smtpUseTLS: checked })}
                    />
                    <Label>Use TLS/SSL</Label>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={emailConfig.maxRetries}
                    onChange={(e) => setEmailConfig({ ...emailConfig, maxRetries: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Limit</Label>
                  <Input
                    type="number"
                    value={emailConfig.dailyLimit}
                    onChange={(e) => setEmailConfig({ ...emailConfig, dailyLimit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Retry Backoff (minutes)</Label>
                <Input
                  value={emailConfig.retryBackoffMinutes}
                  onChange={(e) => setEmailConfig({ ...emailConfig, retryBackoffMinutes: e.target.value })}
                  placeholder="5,15,60"
                />
                <p className="text-xs text-muted-foreground">Comma-separated retry intervals in minutes</p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Email API keys should be configured as Lovable secrets for security. Contact your system administrator.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={() => saveConfig('Email')}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={() => testChannel('Email')}>
                  <TestTube className="mr-2 h-4 w-4" />
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Configuration */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Channel Configuration</CardTitle>
              <CardDescription>Configure SMS gateway provider settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Allow sending notifications via SMS</p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={smsConfig.isEnabled}
                  onCheckedChange={(checked) => setSmsConfig({ ...smsConfig, isEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>SMS Provider</Label>
                <Select value={smsConfig.smsProvider} onValueChange={(value) => setSmsConfig({ ...smsConfig, smsProvider: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Twilio">Twilio</SelectItem>
                    <SelectItem value="MessageBird">MessageBird</SelectItem>
                    <SelectItem value="LocalGateway">Local Gateway</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gateway URL</Label>
                <Input
                  value={smsConfig.smsGatewayUrl}
                  onChange={(e) => setSmsConfig({ ...smsConfig, smsGatewayUrl: e.target.value })}
                  placeholder="https://api.twilio.com/2010-04-01"
                />
              </div>

              <div className="space-y-2">
                <Label>From Number</Label>
                <Input
                  value={smsConfig.smsFromNumber}
                  onChange={(e) => setSmsConfig({ ...smsConfig, smsFromNumber: e.target.value })}
                  placeholder="+1-869-465-2519"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={smsConfig.maxRetries}
                    onChange={(e) => setSmsConfig({ ...smsConfig, maxRetries: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Limit</Label>
                  <Input
                    type="number"
                    value={smsConfig.dailyLimit}
                    onChange={(e) => setSmsConfig({ ...smsConfig, dailyLimit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  SMS API keys should be configured as Lovable secrets. Cost per SMS varies by provider and destination.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={() => saveConfig('SMS')}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={() => testChannel('SMS')}>
                  <TestTube className="mr-2 h-4 w-4" />
                  Send Test SMS
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Push Configuration */}
        <TabsContent value="push" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Push Notification Configuration</CardTitle>
              <CardDescription>Configure push notification service settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Allow sending push notifications to mobile apps</p>
                </div>
                <Switch
                  id="push-enabled"
                  checked={pushConfig.isEnabled}
                  onCheckedChange={(checked) => setPushConfig({ ...pushConfig, isEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Push Provider</Label>
                <Select value={pushConfig.pushProvider} onValueChange={(value) => setPushConfig({ ...pushConfig, pushProvider: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FCM">Firebase Cloud Messaging (FCM)</SelectItem>
                    <SelectItem value="APNS">Apple Push Notification Service (APNS)</SelectItem>
                    <SelectItem value="OneSignal">OneSignal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project ID</Label>
                <Input
                  value={pushConfig.pushProjectId}
                  onChange={(e) => setPushConfig({ ...pushConfig, pushProjectId: e.target.value })}
                  placeholder="your-firebase-project-id"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={pushConfig.maxRetries}
                    onChange={(e) => setPushConfig({ ...pushConfig, maxRetries: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Limit</Label>
                  <Input
                    type="number"
                    value={pushConfig.dailyLimit}
                    onChange={(e) => setPushConfig({ ...pushConfig, dailyLimit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Push notification configuration requires mobile app setup with device token registration.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={() => saveConfig('Push')}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={() => testChannel('Push')}>
                  <TestTube className="mr-2 h-4 w-4" />
                  Send Test Push
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
