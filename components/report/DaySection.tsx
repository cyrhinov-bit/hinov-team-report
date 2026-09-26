import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity } from '@/types';
import { COLORS, SHADOWS } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, Clock, AlertCircle, Plus, Edit2, Trash2, CalendarDays } from 'lucide-react-native';

interface DaySectionProps {
  key?: React.Key;
  dayOfWeek: number;
  dayName: string;
  dateStr?: string;
  activities: Activity[];
  onAddActivity?: (dayOfWeek: number) => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activityId: string) => void;
  readOnly?: boolean;
}

export const DaySection: React.FC<DaySectionProps> = ({
  dayOfWeek,
  dayName,
  dateStr,
  activities,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  readOnly = false,
}) => {
  const getStatusIcon = (status: Activity['status']) => {
    switch (status) {
      case 'terminee':
        return <CheckCircle2 size={16} color={COLORS.success} />;
      case 'en_cours':
        return <Clock size={16} color={COLORS.warning} />;
      default:
        return <AlertCircle size={16} color={COLORS.textMuted} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{dayOfWeek}</Text>
          </View>
          <View>
            <Text style={styles.dayTitle}>{dayName}</Text>
            {dateStr && <Text style={styles.dateSubtitle}>{dateStr}</Text>}
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {activities.length} tâche{activities.length > 1 ? 's' : ''}
            </Text>
          </View>
          {!readOnly && onAddActivity && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => onAddActivity(dayOfWeek)}
              activeOpacity={0.7}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CalendarDays size={20} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
          <Text style={styles.emptyText}>Aucune activité saisie pour ce jour</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {activities.map((act) => (
            <View key={act.id} style={styles.activityItem}>
              <View style={styles.iconCol}>{getStatusIcon(act.status)}</View>
              <View style={styles.contentCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.activityTitle}>{act.title}</Text>
                  <Badge label={act.status} status={act.status} />
                </View>
                {Boolean(act.description) && (
                  <Text style={styles.activityDesc}>{act.description}</Text>
                )}
                {Boolean(act.category) && (
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryTag}>📁 {act.category}</Text>
                  </View>
                )}
              </View>
              {!readOnly && !act.is_locked && (
                <View style={styles.actionsCol}>
                  {onEditActivity && (
                    <TouchableOpacity
                      onPress={() => onEditActivity(act)}
                      style={styles.actionBtn}
                    >
                      <Edit2 size={13} color={COLORS.primaryAccent} />
                    </TouchableOpacity>
                  )}
                  {onDeleteActivity && (
                    <TouchableOpacity
                      onPress={() => onDeleteActivity(act.id)}
                      style={[styles.actionBtn, { borderColor: '#FADBD8' }]}
                    >
                      <Trash2 size={13} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  list: {
    padding: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceMuted,
  },
  iconCol: {
    marginRight: 10,
    marginTop: 2,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  activityDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryTag: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
    marginTop: 2,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 5,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
