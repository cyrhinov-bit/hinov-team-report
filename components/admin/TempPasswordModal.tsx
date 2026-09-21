import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { KeyRound, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';

interface TempPasswordModalProps {
  key?: React.Key;
  visible: boolean;
  temporaryPassword: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

export const TempPasswordModal: React.FC<TempPasswordModalProps> = ({
  visible,
  temporaryPassword,
  userName,
  userEmail,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(temporaryPassword);
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <KeyRound size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Mot de Passe Temporaire</Text>

          <View style={styles.userBadge}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </View>

          <View style={styles.warningBox}>
            <AlertTriangle size={18} color="#D97706" style={{ marginTop: 2 }} />
            <Text style={styles.warningText}>
              IMPORTANT : Ce mot de passe ne sera affiché qu'
              <Text style={{ fontWeight: '800' }}>UNE SEULE FOIS</Text>. Notez-le
              ou communiquez-le immédiatement au collaborateur.
            </Text>
          </View>

          <View style={styles.pwdBox}>
            <Text style={styles.pwdText} selectable>
              {temporaryPassword}
            </Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
              {copied ? (
                <Check size={18} color={COLORS.success} />
              ) : (
                <Copy size={18} color={COLORS.primaryAccent} />
              )}
            </TouchableOpacity>
          </View>
          {copied && (
            <Text style={styles.copiedNotice}>✓ Copié dans le presse-papiers</Text>
          )}

          <View style={styles.infoFooter}>
            <ShieldCheck size={16} color={COLORS.success} />
            <Text style={styles.infoFooterText}>
              L'utilisateur sera forcé de définir son propre mot de passe à sa
              première connexion.
            </Text>
          </View>

          <Button
            title="J'ai bien noté le mot de passe"
            onPress={onClose}
            variant="primary"
            style={{ width: '100%', marginTop: 16 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 34, 64, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  userBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  pwdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B2240',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  pwdText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
  },
  copiedNotice: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 6,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  infoFooterText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 15,
  },
});

