import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { NotificationHelper } from '@/utils/notifications';
import { NotificationToast, ReportNotification } from '@/components/ui/NotificationToast';
import { router } from 'expo-router';

interface NotificationContextType {
  notifications: ReportNotification[];
  unreadCount: number;
  activeToast: ReportNotification | null;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ReportNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<ReportNotification | null>(null);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'directeur_admin';

  // Request browser / desktop / mobile notification permission on admin login
  useEffect(() => {
    if (isAdmin) {
      NotificationHelper.requestPermissions().catch(() => {});
    }
  }, [isAdmin]);

  const handleNewSubmittedReport = useCallback(
    async (payload: any) => {
      const record = payload.new;
      if (!record || record.status !== 'soumis') return;
      if (record.user_id === user?.id) return; // Don't notify self

      try {
        // Fetch collaborator profile details
        let authorName = 'Un collaborateur';
        let department = '';

        if (isSupabaseConfigured && record.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, department')
            .eq('id', record.user_id)
            .single();

          if (profile) {
            authorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || authorName;
            department = profile.department || '';
          }
        }

        const newNotif: ReportNotification = {
          id: `notif-${record.id || Date.now()}`,
          reportId: record.id,
          authorName,
          department,
          week: record.week_number,
          year: record.year,
          timestamp: new Date(),
        };

        // 1. Add to state
        setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
        setUnreadCount((prev) => prev + 1);

        // 2. Trigger System / Desktop notification + Sound chime
        await NotificationHelper.notifyReportReceivedByAdmin({
          week: record.week_number,
          year: record.year,
          authorName,
          department,
        });

        // 3. Trigger In-App Toast
        setActiveToast(newNotif);
      } catch (err) {
        console.warn('Error handling report notification:', err);
      }
    },
    [user?.id, isAdmin]
  );

  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured) return;

    // Realtime listener on reports table
    const channel = supabase
      .channel(`rt:admin_report_notifications:${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          if (payload.new?.status === 'soumis') {
            handleNewSubmittedReport(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          // If status transitioned to 'soumis'
          if (payload.new?.status === 'soumis' && payload.old?.status !== 'soumis') {
            handleNewSubmittedReport(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user?.id, handleNewSubmittedReport]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleToastPress = (notif: ReportNotification) => {
    setActiveToast(null);
    setUnreadCount((prev) => Math.max(0, prev - 1));
    router.push('/(collaborator)/supervision' as any);
  };

  const handleDismissToast = () => {
    setActiveToast(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        markAsRead,
        clearAll,
        requestPermission: () => NotificationHelper.requestPermissions(),
      }}
    >
      {children}
      <NotificationToast
        notification={activeToast}
        onPress={handleToastPress}
        onDismiss={handleDismissToast}
      />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
