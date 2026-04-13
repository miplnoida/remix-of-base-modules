

## Real-Time Notification System Enhancement

### Current State
- `in_app_notifications` table exists with all required columns (user_id, title, body, is_read, created_at, notification_type, priority, etc.)
- Indexes exist on `user_id`, `notification_type`, `module` — but **no composite index on (user_id, is_read)**
- Table is **NOT** registered with `supabase_realtime` publication
- Frontend polls every 30 seconds via `refetchInterval: 30000` — no realtime subscription
- No popup/toast for incoming notifications

### Changes

#### 1. Database Migration
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;`
- Add composite index: `CREATE INDEX idx_in_app_notif_user_read ON public.in_app_notifications (user_id, is_read);`

#### 2. Frontend: `InAppNotificationBell.tsx`
- **Add realtime subscription**: Subscribe to `postgres_changes` on `in_app_notifications` filtered by `user_id = user.id`. On `INSERT`, prepend the new notification to the cached query data and show a popup toast. On `UPDATE` (read status change), update the cached entry in-place.
- **Remove polling**: Remove `refetchInterval: 30000` since realtime replaces it.
- **Popup notification**: When a new notification arrives via realtime, display a small animated popup card above the bell icon using a local state variable. The popup auto-dismisses after 5 seconds and can be clicked to navigate or manually dismissed. Styled consistently with the app's card/toast design.

#### 3. Frontend: `NotificationCenter.tsx`
- Add the same realtime subscription pattern so the full notification list page also updates in real time without refresh.

### Technical Details

**Realtime subscription pattern** (inside `useEffect` in `InAppNotificationBell`):
```typescript
const channel = supabase
  .channel(`notifications:${user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'in_app_notifications',
    filter: `user_id=eq.${user.id}`,
  }, (payload) => {
    // Prepend to query cache, show popup
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'in_app_notifications',
    filter: `user_id=eq.${user.id}`,
  }, (payload) => {
    // Update read status in cache
  })
  .subscribe();
```

**Popup component**: A small floating card rendered via absolute positioning relative to the bell button, showing title + truncated body, with fade-in/out animation via Tailwind `animate-in`/`animate-out`. Auto-dismiss via `setTimeout(5000)`.

### Files to Modify

| File | Change |
|------|--------|
| Migration | Enable realtime + add composite index |
| `src/components/notifications/InAppNotificationBell.tsx` | Add realtime subscription, popup UI, remove polling |
| `src/pages/notifications/NotificationCenter.tsx` | Add realtime subscription for live list updates |

### Backward Compatibility
- No schema changes to existing columns — only additive (index + realtime publication)
- Existing notification insert paths (edge functions, services) work unchanged
- Read/unread mutations continue using the same Supabase client calls

