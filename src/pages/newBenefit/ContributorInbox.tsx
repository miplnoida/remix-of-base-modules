import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import { newBenefitService } from '@/services/newBenefitService';
import { Message } from '@/types/newBenefit';
import { 
  Mail, 
  Search, 
  Send, 
  Paperclip, 
  Eye, 
  Calendar,
  User,
  Reply,
  Archive
} from 'lucide-react';

export const ContributorInbox: React.FC = () => {
  const { currentUser } = useNewBenefitAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.ssn) {
      loadMessages();
    }
  }, [currentUser]);

  const loadMessages = async () => {
    if (!currentUser?.ssn) return;
    
    try {
      const messagesData = await newBenefitService.getMessages(currentUser.ssn);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !currentUser?.ssn) return;

    try {
      await newBenefitService.sendMessage({
        fromUser: currentUser.ssn,
        toUser: selectedMessage.fromUser,
        claimId: selectedMessage.claimId,
        subject: `Re: ${selectedMessage.subject}`,
        message: replyText,
        read: false
      });
      
      setReplyText('');
      loadMessages(); // Refresh messages
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const markAsRead = (messageId: string) => {
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, read: true } : m
    ));
  };

  const filteredMessages = messages.filter(message =>
    message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (message.claimId && message.claimId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Mail className="h-6 w-6" />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Secure messages from Social Security Board</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No messages found' : 'No messages yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedMessage?.id === message.id ? 'bg-muted' : ''
                        } ${!message.read ? 'border-l-4 border-l-primary bg-blue-50/50' : ''}`}
                        onClick={() => {
                          setSelectedMessage(message);
                          if (!message.read) {
                            markAsRead(message.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {message.fromUser.includes('@') ? 'SSB Officer' : 'System'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.sentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className={`text-sm mb-1 ${!message.read ? 'font-semibold' : ''}`}>
                          {message.subject}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {message.message}
                        </p>
                        {message.claimId && (
                          <Badge variant="outline" className="text-xs mt-2">
                            Claim: {message.claimId}
                          </Badge>
                        )}
                        {!message.read && (
                          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Details */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{selectedMessage.subject}</span>
                      {!selectedMessage.read && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4 mt-2">
                      <span className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>From: SSB Officer</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(selectedMessage.sentDate).toLocaleString()}</span>
                      </span>
                      {selectedMessage.claimId && (
                        <Badge variant="outline" className="text-xs">
                          Claim: {selectedMessage.claimId}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Message Content */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {/* Attachments (if any) */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attachments
                    </h4>
                    <div className="space-y-2">
                      {selectedMessage.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{attachment}</span>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply Section */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </h4>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="min-h-32"
                    />
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach Document
                      </Button>
                      <Button 
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a message to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};