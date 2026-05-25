"use client";

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/stores/authStore';
import { useNotificationsStore, Notification } from '@/stores/notificationsStore';

export default function NotificationsRealtimeProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (!currentUser?.id) return;
    const store = useNotificationsStore.getState();
    store.fetch();

    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          useNotificationsStore.getState().pushIncoming(payload.new as Notification);
        }
      )
      .on('system', { event: 'SUBSCRIBED' }, () => {
        useNotificationsStore.getState().fetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  return <>{children}</>;
}
