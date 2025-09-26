import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Bell, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Info, 
  DollarSign, 
  Calendar,
  ExternalLink,
  Check
} from "lucide-react";
import { notificationService } from '@/services/notificationService';
import { NotificationItem } from '@/types/notifications';
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, searchTerm, filterType, filterStatus]);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications('1'); // Current user
      setNotifications(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = notifications;

    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type.toLowerCase() === filterType.toLowerCase());
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(n => 
        filterStatus === 'read' ? n.isRead : !n.isRead
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive",
      });
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      const promises = Array.from(selectedNotifications).map(id => 
        notificationService.markAsRead(id)
      );
      await Promise.all(promises);
      
      setNotifications(prev => prev.map(n => 
        selectedNotifications.has(n.id) ? { ...n, isRead: true } : n
      ));
      setSelectedNotifications(new Set());
      
      toast({
        title: "Success",
        description: `${selectedNotifications.size} notifications marked as read`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive",
      });
    }
  };

  const toggleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const selectAll = () => {
    const unreadIds = filteredNotifications
      .filter(n => !n.isRead)
      .map(n => n.id);
    setSelectedNotifications(new Set(unreadIds));
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `h-4 w-4 ${priority === 'High' ? 'text-red-500' : 
      priority === 'Medium' ? 'text-yellow-500' : 'text-blue-500'}`;
    
    switch (type.toLowerCase()) {
      case 'system':
        return <AlertTriangle className={iconClass} />;
      case 'payment':
        return <DollarSign className={iconClass} />;
      case 'task':
        return <Calendar className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variant = priority === 'High' ? 'destructive' : 
      priority === 'Medium' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{priority}</Badge>;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notification Center
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Manage your in-app notifications</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Your recent notifications and updates</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedNotifications.size > 0 && (
                <Button onClick={handleBulkMarkAsRead} size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Mark Selected as Read ({selectedNotifications.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={selectAll} variant="outline" size="sm">
              Select All Unread
            </Button>
          </div>

          <div className="space-y-2">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    notification.isRead 
                      ? 'bg-muted/30 border-muted' 
                      : 'bg-card border-border shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedNotifications.has(notification.id)}
                      onCheckedChange={() => toggleSelectNotification(notification.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                        <h4 className={`font-medium truncate ${!notification.isRead ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {getPriorityBadge(notification.priority)}
                        <Badge variant="outline">{notification.type}</Badge>
                        {!notification.isRead && (
                          <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-2">
                          {notification.actionUrl && (
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          )}
                          {!notification.isRead && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark as Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}