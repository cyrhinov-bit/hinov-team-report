import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS } from '@/constants/colors';
import { ColorLine } from './ColorLine';
import { Button } from './Button';
import {
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react-native';

export type ConfirmationType = 'confirm' | 'danger' | 'warning' | 'success' | 'info';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  isAlertOnly?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isAlertOnly = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const getIconConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle size={26} color={COLORS.danger} />,
          bg: COLORS.dangerLight,
          confirmVariant: 'danger' as const,
        };
      case 'warning':
        return {
          icon: <AlertCircle size={26} color={COLORS.warning} />,
          bg: COLORS.warningLight,
          confirmVariant: 'gold' as const,
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={26} color={COLORS.success} />,
          bg: COLORS.successLight,
          confirmVariant: 'success' as const,
        };
      case 'info':
        return {
          icon: <Info size={26} color={COLORS.primaryAccent} />,
          bg: COLORS.infoLight,
          confirmVariant: 'accent' as const,
        };
      default:
        return {
          icon: <HelpCircle size={26} color={COLORS.primary} />,
          bg: COLORS.surfaceSubtle,
          confirmVariant: 'primary' as const,
        };
    }
  };

  const config = getIconConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={isAlertOnly ? onConfirm : onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              {/* Jeweler Signature Multi-Stripe Color Line */}
              <ColorLine height={4} style={styles.colorLine} />

              {/* Close Button on top right */}
              {Boolean(onCancel && !isAlertOnly) && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}

              {/* Icon Circle */}
              <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                {config.icon}
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Actions */}
              <View style={styles.actionsRow}>
                {!isAlertOnly && (
                  <Button
                    title={cancelText}
                    variant="outline"
                    onPress={onCancel || (() => {})}
                    style={styles.cancelBtn}
                    textStyle={{ color: COLORS.textSecondary }}
                  />
                )}
                <Button
                  title={confirmText}
                  variant={config.confirmVariant}
                  onPress={onConfirm}
                  loading={loading}
                  style={styles.confirmBtn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 440,
    padding: 24,
    paddingTop: 0,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  colorLine: {
    width: '120%',
    marginLeft: '-10%',
    marginBottom: 20,
    borderRadius: 0,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
    zIndex: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderColor: COLORS.border,
  },
  confirmBtn: {
    flex: 1.2,
  },
});
