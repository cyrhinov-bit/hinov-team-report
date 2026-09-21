import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity } from '@/types';
import { COLORS } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, Clock, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react-native';

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
        <View>
          <Text style={styles.dayTitle}>{dayName.toUpperCase()}</Text>
          {dateStr && <Text style={styles.dateSubtitle}>{dateStr}</Text>}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.countText}>
            {activities.length} activité{activities.length > 1 ? 's' : ''}
          </Text>
          {!readOnly && onAddActivity && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => onAddActivity(dayOfWeek)}
              activeOpacity={0.7}
            >
              <Plus size={16} color={COLORS.primaryAccent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune activité enregistrée</Text>
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
                  <Text style={styles.categoryTag}>📁 {act.category}</Text>
                )}
              </View>
              {!readOnly && !act.is_locked && (
                <View style={styles.actionsCol}>
                  {onEditActivity && (
                    <TouchableOpacity
                      onPress={() => onEditActivity(act)}
                      style={styles.actionBtn}
                    >
                      <Edit2 size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {onDeleteActivity && (
                    <TouchableOpacity
                      onPress={() => onDeleteActivity(act.id)}
                      style={styles.actionBtn}
                    >
                      <Trash2 size={14} color={COLORS.danger} />
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  dateSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  addBtn: {
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 6,
  },
  emptyContainer: {
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  list: {
    paddingVertical: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCol: {
    marginTop: 2,
    marginRight: 10,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  activityDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  categoryTag: {
    fontSize: 11,
    color: COLORS.primaryAccent,
    marginTop: 4,
    fontWeight: '500',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  actionBtn: {
    padding: 6,
  },
});

