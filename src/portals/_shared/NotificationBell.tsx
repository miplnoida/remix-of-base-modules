import { Link } from 'react-router-dom';
import { Bell, Mail, FileText, Inbox } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useExternalMessages } from '@/portals/_shared/externalHooks';

interface Props {
  viewAllHref: string;
}

export function NotificationBell({ viewAllHref }: Props) {
  const { data } = useExternalMessages();
  const msgs = (data?.messages ?? []) as any[];
  const unread = msgs.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications (${unread} unread)`}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 && <Badge variant="secondary" className="h-5 text-[10px]">{unread} new</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {msgs.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            <Inbox className="mx-auto mb-2 h-5 w-5 opacity-60" />
            You're all caught up.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {msgs.slice(0, 6).map((m: any, i: number) => (
              <DropdownMenuItem key={i} asChild>
                <Link to={viewAllHref} className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{m.subject ?? m.template_code ?? 'Message'}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{m.preview ?? m.body ?? m.created_at ?? ''}</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={viewAllHref} className="flex items-center justify-center text-xs font-medium text-primary">
            <FileText className="mr-1 h-3.5 w-3.5" /> View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
