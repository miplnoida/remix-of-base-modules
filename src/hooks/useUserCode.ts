import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserCodeData {
  userCode: string | null;
  userId: string | null;
  fullName: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get the current authenticated user's user_code.
 * The user_code is derived as first-initial + full last name (e.g. "JBarry").
 * Duplicates get a numeric suffix (JBarry2, JBarry3).
 * Use this code for audit fields like entered_by, modified_by, verified_by, etc.
 *
 * This hook uses a PASSIVE auth listener — no awaited Supabase calls inside
 * onAuthStateChange — and loads profile data in a separate effect.
 */
export function useUserCode(): UserCodeData {
  const [data, setData] = useState<UserCodeData>({
    userCode: null,
    userId: null,
    fullName: null,
    isLoading: true,
    error: null,
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // PASSIVE auth listener — only sets userId, no DB calls
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
      if (!session?.user) {
        setData({ userCode: null, userId: null, fullName: null, isLoading: false, error: null });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      if (!uid) {
        setData({ userCode: null, userId: null, fullName: null, isLoading: false, error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Separate effect: fetch profile when userId changes
  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const fetchUserCode = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_code, full_name')
          .eq('id', currentUserId)
          .single();

        if (cancelled) return;

        if (profileError) {
          setData({
            userCode: null,
            userId: currentUserId,
            fullName: null,
            isLoading: false,
            error: profileError.message,
          });
        } else {
          setData({
            userCode: profile?.user_code || null,
            userId: currentUserId,
            fullName: profile?.full_name || null,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setData({
          userCode: null,
          userId: currentUserId,
          fullName: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };

    setData(prev => ({ ...prev, isLoading: true }));
    fetchUserCode();

    return () => { cancelled = true; };
  }, [currentUserId]);

  return data;
}

/**
 * Utility function to get user_code for the current authenticated user.
 * Use this in services or non-React contexts.
 */
export async function getCurrentUserCode(): Promise<string | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.warn('getCurrentUserCode: Not authenticated');
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_code')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('getCurrentUserCode: Failed to fetch profile', profileError);
      return null;
    }

    return profile?.user_code || null;
  } catch (err) {
    console.error('getCurrentUserCode: Error', err);
    return null;
  }
}

/**
 * Get user_code by user ID (for admin operations)
 */
export async function getUserCodeById(userId: string): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_code')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('getUserCodeById: Failed to fetch profile', error);
      return null;
    }

    return profile?.user_code || null;
  } catch (err) {
    console.error('getUserCodeById: Error', err);
    return null;
  }
}
