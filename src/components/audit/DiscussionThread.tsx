import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { useAuditDiscussions } from '@/hooks/useAuditDiscussions';
import { useUserCode } from '@/hooks/useUserCode';

interface DiscussionThreadProps {
  entityType: string;
  entityId: string;
}

export function DiscussionThread({ entityType, entityId }: DiscussionThreadProps) {
  const { userCode, fullName } = useUserCode();
  const { thread, comments, createThread, addComment, isLoading } = useAuditDiscussions(entityType, entityId);
  const [newComment, setNewComment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async () => {
    if (!newComment.trim()) return;
    
    if (!thread) {
      await createThread.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        created_by: userCode || undefined,
      });
    }
    
    // Need thread_id - get from thread or newly created
    const threadId = thread?.id;
    if (threadId) {
      addComment.mutate({
        thread_id: threadId,
        author_name: fullName || userCode || 'Unknown',
        content: newComment.trim(),
      });
    }
    setNewComment('');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-3 mb-3">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No comments yet. Start a discussion below.
            </p>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(comment.author_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{comment.author_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={1}
            className="min-h-[36px] text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
