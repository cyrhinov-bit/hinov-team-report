import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserProfile } from '@/types';
import { COLORS, SHADOWS } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { KeyRound, Power, ChevronRight, Mail, Building2 } from 'lucide-react-native';

interface UserCardProps {
  key?: React.Key;
  user: UserProfile;
  onPress: () => void;
  onResetPassword?: () => void;
  onToggleActive?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onPress,
  onResetPassword,
  onToggleActive,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, !user.is_active && styles.inactiveContainer]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <Avatar url={user.avatar_url} name={user.full_name} size={46} showBorder />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user.full_name}
            </Text>
            <Badge label={user.role} role={user.role} />
          </View>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {user.job_title || 'Fonction non renseignée'}
          </Text>
          <View style={styles.deptRow}>
            <Building2 size={12} color={COLORS.textSecondary} />
            <Text style={styles.department} numberOfLines={1}>
              {user.department || 'Général'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.emailRow}>
        <Mail size={13} color={COLORS.textSecondary} />
        <Text style={styles.emailText} numberOfLines={1}>{user.email}</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: user.is_active ? COLORS.success : COLORS.danger }]} />
          <Text style={[styles.statusText, { color: user.is_active ? COLORS.success : COLORS.danger }]}>
            {user.is_active ? 'Actif' : 'Inactif'}
          </Text>
        </View>
      </View>

      <View style={styles.footerActions}>
        {onResetPassword && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onResetPassword();
            }}
          >
            <KeyRound size={13} color={COLORS.primaryAccent} />
            <Text style={styles.actionText}>Réinitialiser MDP</Text>
          </TouchableOpacity>
        )}

        {onToggleActive && (
          <TouchableOpacity
            style={[styles.actionBtn, { marginLeft: 'auto' }]}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleActive();
            }}
          >
            <Power size={13} color={user.is_active ? COLORS.danger : COLORS.success} />
            <Text style={[styles.actionText, { color: user.is_active ? COLORS.danger : COLORS.success }]}>
              {user.is_active ? 'Désactiver' : 'Activer'}
            </Text>
          </TouchableOpacity>
        )}

        <ChevronRight size={16} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  inactiveContainer: {
    opacity: 0.75,
    backgroundColor: '#FAFBFD',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCol: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  department: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.surfaceMuted,
    gap: 6,
  },
  emailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
});
