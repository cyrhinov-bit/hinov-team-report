import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserProfile } from '@/types';
import { COLORS } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { KeyRound, Power, ChevronRight, Mail } from 'lucide-react-native';

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
        <Avatar url={user.avatar_url} name={user.full_name} size={44} />
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
          <Text style={styles.department} numberOfLines={1}>
            🏢 {user.department || 'Général'}
          </Text>
        </View>
      </View>

      <View style={styles.emailRow}>
        <Mail size={13} color={COLORS.textSecondary} />
        <Text style={styles.emailText}>{user.email}</Text>
        <View style={[styles.statusDot, { backgroundColor: user.is_active ? COLORS.success : COLORS.danger }]} />
        <Text style={[styles.statusText, { color: user.is_active ? COLORS.success : COLORS.danger }]}>
          {user.is_active ? 'Actif' : 'Inactif'}
        </Text>
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
            <KeyRound size={14} color={COLORS.primaryAccent} />
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
            <Power size={14} color={user.is_active ? COLORS.danger : COLORS.success} />
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  inactiveContainer: {
    opacity: 0.75,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  jobTitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  department: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  emailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    marginLeft: 4,
  },
});

