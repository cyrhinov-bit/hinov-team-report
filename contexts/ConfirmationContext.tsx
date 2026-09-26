import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmationModal, ConfirmationType } from '@/components/ui/ConfirmationModal';
import { setGlobalAlertHandler } from '@/utils/alert';

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertOptions {
  title: string;
  message: string;
  type?: ConfirmationType;
  buttonText?: string;
  onOk?: () => void;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmOptions) => void;
  alert: (title: string, message: string, options?: Partial<AlertOptions>) => void;
  close: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: ConfirmationType;
    confirmText: string;
    cancelText: string;
    isAlertOnly: boolean;
    loading: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    isAlertOnly: false,
    loading: false,
    onConfirm: () => {},
  });

  const close = useCallback(() => {
    setModalState((prev) => ({ ...prev, visible: false }));
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    const determinedType: ConfirmationType =
      options.type || (options.destructive ? 'danger' : 'confirm');

    setModalState({
      visible: true,
      title: options.title,
      message: options.message,
      type: determinedType,
      confirmText: options.confirmText || 'Confirmer',
      cancelText: options.cancelText || 'Annuler',
      isAlertOnly: false,
      loading: false,
      onConfirm: async () => {
        try {
          setModalState((prev) => ({ ...prev, loading: true }));
          await options.onConfirm();
        } finally {
          setModalState((prev) => ({ ...prev, visible: false, loading: false }));
        }
      },
      onCancel: () => {
        setModalState((prev) => ({ ...prev, visible: false }));
        options.onCancel?.();
      },
    });
  }, []);

  const alert = useCallback((title: string, message: string, options?: Partial<AlertOptions>) => {
    setModalState({
      visible: true,
      title,
      message,
      type: options?.type || 'info',
      confirmText: options?.buttonText || 'OK',
      cancelText: '',
      isAlertOnly: true,
      loading: false,
      onConfirm: () => {
        setModalState((prev) => ({ ...prev, visible: false }));
        options?.onOk?.();
      },
      onCancel: () => {
        setModalState((prev) => ({ ...prev, visible: false }));
        options?.onOk?.();
      },
    });
  }, []);

  // Connect global alert utility to this provider instance
  React.useEffect(() => {
    setGlobalAlertHandler({
      confirm: (opts) => confirm(opts),
      alert: (title, msg, onOk) => alert(title, msg, { onOk }),
    });
  }, [confirm, alert]);

  return (
    <ConfirmationContext.Provider value={{ confirm, alert, close }}>
      {children}
      <ConfirmationModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        isAlertOnly={modalState.isAlertOnly}
        loading={modalState.loading}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
      />
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};
