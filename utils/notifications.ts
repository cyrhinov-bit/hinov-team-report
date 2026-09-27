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
    // 1. Electron Desktop
    if (typeof window !== 'undefined' && (window as any).electronAPI?.showNotification) {
      return true;
    }

    // 2. Web Browser
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          try {
            const res = await Notification.requestPermission();
            return res === 'granted';
          } catch (e) {
            return false;
          }
        }
        return Notification.permission === 'granted';
      }
      return false;
    }

    // 3. Mobile Native
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

  playChime(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const now = ctx.currentTime;
          
          // First tone (pleasant high chime)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
          gain1.gain.setValueAtTime(0.15, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.4);

          // Second harmonic chime
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(880, now + 0.12);
          osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6
          gain2.gain.setValueAtTime(0.12, now + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.55);
        }
      } catch (e) {
        // audio playback might be restricted before user gesture
      }
    }
  },

  async sendLocalNotification(title: string, body: string): Promise<void> {
    this.playChime();

    // 1. Electron Desktop Native Bridge
    if (typeof window !== 'undefined' && (window as any).electronAPI?.showNotification) {
      try {
        (window as any).electronAPI.showNotification(title, body);
        return;
      } catch (e) {
        console.warn('Electron notification error:', e);
      }
    }

    // 2. Web Browser Notification
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
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

    // 3. Mobile Native (iOS / Android)
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

  async notifyReportReceivedByAdmin(params: {
    week: number;
    year: number;
    authorName: string;
    department?: string;
  }): Promise<void> {
    const title = `📄 Nouveau rapport reçu - Semaine ${params.week}`;
    const deptInfo = params.department ? ` (${params.department})` : '';
    const body = `${params.authorName}${deptInfo} vient de soumettre son rapport d'activités pour la Semaine ${params.week} (${params.year}).`;
    
    await this.sendLocalNotification(title, body);
  },
};
