import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { confirmAction } from '@/utils/alert';
import { ActivitiesService } from '@/services/activities';
import { DaySection } from '@/components/report/DaySection';
import { Activity } from '@/types';
import { getWeekNumber, getWeekRange, FRENCH_DAYS } from '@/utils/date';
import { Plus, Calendar, Lock } from 'lucide-react-native';

export default function ActivitiesListScreen() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');

  const { week, year } = getWeekNumber();
  const weekRange = getWeekRange(week, year);

  const loadActivities = async () => {
    if (!user) return;
    try {
      const list = await ActivitiesService.getActivitiesForUser(
        user.id,
        weekRange.startDate,
        weekRange.endDate
      );
      setActivities(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadActivities();
      }
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const handleDelete = (activityId: string) => {
    confirmAction({
      title: 'Supprimer l’activité',
      message: 'Êtes-vous sûr de vouloir supprimer cette tâche ?',
      confirmText: 'Supprimer',
      destructive: true,
      onConfirm: async () => {
        const res = await ActivitiesService.deleteActivity(activityId);
        if (res.success) {
          setActivities((prev) => prev.filter((a) => a.id !== activityId));
        }
      },
    });
  };

  const handleEdit = (activity: Activity) => {
    if (activity.is_locked) {
      Alert.alert(
        'Activité verrouillée',
        'Cette activité fait partie d’un rapport hebdomadaire déjà soumis et ne peut plus être modifiée.'
      );
      return;
    }
    router.push({
      pathname: '/(collaborator)/activities/[id]',
      params: { id: activity.id },
    });
  };

  const handleAddForDay = (dayOfWeek: number) => {
    const matchedDay = weekRange.days.find((d) => d.dayOfWeek === dayOfWeek);
    router.push({
      pathname: '/(collaborator)/activities/new',
      params: {
        date: matchedDay?.dateStr || new Date().toISOString().split('T')[0],
        dayOfWeek,
      },
    });
  };

  // Group activities by day of week (1 to 5)
  const activitiesByDay: Record<number, Activity[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  activities.forEach((act) => {
    const d = act.day_of_week || 1;
    if (!activitiesByDay[d]) activitiesByDay[d] = [];
    activitiesByDay[d].push(act);
  });

  const filteredDays =
    selectedDay === 'all'
      ? FRENCH_DAYS
      : FRENCH_DAYS.filter((d) => d.key === selectedDay);

  return (
    <View style={styles.container}>
      {/* Top Week Bar */}
      <View style={styles.topBar}>
        <View style={styles.weekInfo}>
          <Calendar size={16} color={COLORS.primaryAccent} />
          <Text style={styles.weekText}>
            Semaine {week} ({weekRange.startDate} au {weekRange.endDate})
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(collaborator)/activities/new')}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Day Filter Pills */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, selectedDay === 'all' && styles.filterPillActive]}
          onPress={() => setSelectedDay('all')}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedDay === 'all' && styles.filterPillTextActive,
            ]}
          >
            Tous ({activities.length})
          </Text>
        </TouchableOpacity>

        {FRENCH_DAYS.map((d) => {
          const count = (activitiesByDay[d.key] || []).length;
          const isSelected = selectedDay === d.key;
          return (
            <TouchableOpacity
              key={d.key}
              style={[styles.filterPill, isSelected && styles.filterPillActive]}
              onPress={() => setSelectedDay(d.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isSelected && styles.filterPillTextActive,
                ]}
              >
                {d.label.substring(0, 3)} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List of Days & Activities */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredDays.map((d) => {
          const matchedRangeDay = weekRange.days.find((wd) => wd.dayOfWeek === d.key);
          return (
            <DaySection
              key={d.key}
              dayOfWeek={d.key}
              dayName={d.label}
              dateStr={matchedRangeDay?.dateStr}
              activities={activitiesByDay[d.key] || []}
              onAddActivity={handleAddForDay}
              onEditActivity={handleEdit}
              onDeleteActivity={handleDelete}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});

