import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure default notification handler for native mobile
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    // ignore
  }
}

export const NotificationHelper = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
        return Notification.permission === 'granted';
      }
      return false;
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        return newStatus === 'granted';
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  async sendLocalNotification(title: string, body: string): Promise<void> {
    // 1. Web Browser & Electron Desktop Notification
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: '/favicon.ico',
            });
          } catch (e) {
            console.log('Web notification error:', e);
          }
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(title, {
                body,
                icon: '/favicon.ico',
              });
            }
          });
        }
      }
      return;
    }

    // 2. Mobile Native (iOS / Android)
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (err) {
      console.warn('Native notification error:', err);
    }
  },

  async notifyReportSubmitted(params: {
    week: number;
    year: number;
    authorName?: string;
    recipientEmail?: string;
  }): Promise<void> {
    const title = `✅ Rapport S${params.week} soumis avec succès`;
    const recipientText = params.recipientEmail ? ` à la Direction (${params.recipientEmail})` : ' à la Direction';
    const body = `Votre rapport hebdomadaire pour la Semaine ${params.week} (${params.year}) a bien été validé et transmis${recipientText}.`;
    
    await this.sendLocalNotification(title, body);
  },
};
