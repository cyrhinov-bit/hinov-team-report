import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: 'confirm' | 'danger' | 'warning' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  destructive?: boolean;
}

type GlobalAlertHandler = {
  confirm: (options: ConfirmOptions) => void;
  alert: (title: string, message: string, onOk?: () => void) => void;
};

let globalHandler: GlobalAlertHandler | null = null;

export const setGlobalAlertHandler = (handler: GlobalAlertHandler) => {
  globalHandler = handler;
};

export const confirmAction = (options: ConfirmOptions) => {
  if (globalHandler) {
    globalHandler.confirm(options);
    return;
  }

  // Fallback if modal context is not mounted yet
  const { title, message, confirmText = 'Confirmer', cancelText = 'Annuler', onConfirm, onCancel, destructive } = options;
  if (Platform.OS === 'web') {
    const fullPrompt = `${title}\n\n${message}`;
    const confirmed = typeof window !== 'undefined' ? window.confirm(fullPrompt) : true;
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  }
};

export const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (globalHandler) {
    globalHandler.alert(title, message, onOk);
    return;
  }

  // Fallback
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};
