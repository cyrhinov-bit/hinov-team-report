import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Activity, ActivityStatus, useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { getCurrentWeekRange } from '@/lib/constants';

const statuses: ActivityStatus[] = ['Terminée', 'En cours', 'En attente'];
const logo = require('@/assets/images/htr-logo.jpeg');

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type FormState = {
  date: string;
  title: string;
  description: string;
  status: ActivityStatus;
};

const defaultForm = (): FormState => ({
  date: getTodayString(),
  title: '',
  description: '',
  status: 'Terminée',
});

export default function ActivitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ openAdd?: string }>();
  const { activities, profile, addActivity, updateActivity, deleteActivity } = useAppState();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());

  useEffect(() => {
    if (params.openAdd === 'true') {
      openAdd();
    }
  }, [params.openAdd]);

  const groupedActivities = useMemo(() => {
    const { start, end } = getCurrentWeekRange();
    return [...activities]
      .filter((a) => a.date >= start && a.date <= end)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activities]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm());
    setModalVisible(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setForm({
      date: activity.date,
      title: activity.title,
      description: activity.description,
      status: activity.status,
    });
    setModalVisible(true);
  };

  const saveActivity = () => {
    if (!form.title.trim()) {
      Alert.alert('Titre manquant', 'Ajoutez un titre pour enregistrer cette activité.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ (ex: 2026-09-08).');
      return;
    }
    const dateObj = new Date(`${form.date}T12:00:00`);
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Date invalide', 'La date saisie n\'est pas une date réelle.');
      return;
    }
    if (editingId) {
      updateActivity(editingId, {
        date: form.date,
        title: form.title.trim(),
        description: form.description.trim() || 'Aucune description ajoutée.',
        status: form.status,
      });
    } else {
      addActivity({
        date: form.date,
        title: form.title.trim(),
        description: form.description.trim() || 'Aucune description ajoutée.',
        status: form.status,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  const confirmDelete = (id: string) => {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm('Supprimer cette activité ? Cette action est définitive.') : true;
      if (ok) {
        deleteActivity(id);
      }
      return;
    }
    Alert.alert('Supprimer cette activité ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteActivity(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 100 }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>JOURNAL D’ACTIVITÉ</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Mes activités</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Capturez vos avancées au fil de la semaine.
            </Text>
          </View>
          <Image source={profile.avatarUri ? { uri: profile.avatarUri } : logo} style={[styles.headerAvatar, { borderColor: colors.border }]} />
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>Cette semaine</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.blueSoft }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{activities.length}</Text>
          </View>
        </View>

        {groupedActivities.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.blueSoft }]}>
              <Feather name="edit-3" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Votre journal est vide</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Appuyez sur le bouton + pour ajouter votre première activité.
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Les jours sans activité sont tout à fait normaux.
            </Text>
          </View>
        ) : (
          groupedActivities.map((activity) => (
            <View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.activityTop}>
                <View style={[styles.categoryDot, { backgroundColor: activity.status === 'Terminée' ? colors.success : colors.warning }]} />
                <Text style={[styles.activityDate, { color: colors.mutedForeground }]}>{activity.date}</Text>
                <View style={styles.activityActions}>
                  <Pressable
                    testID={`edit-${activity.id}`}
                    onPress={() => openEdit(activity)}
                    style={({ pressed }) => [styles.actionIconBtn, { backgroundColor: colors.blueSoft, opacity: pressed ? 0.7 : 1 }]}
                    hitSlop={6}
                  >
                    <Feather name="edit-2" size={14} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    testID={`delete-${activity.id}`}
                    onPress={() => confirmDelete(activity.id)}
                    style={({ pressed }) => [styles.actionIconBtn, { backgroundColor: colors.orangeSoft, opacity: pressed ? 0.7 : 1 }]}
                    hitSlop={6}
                  >
                    <Feather name="trash-2" size={14} color={colors.warning} />
                  </Pressable>
                </View>
              </View>
              <Text style={[styles.activityTitle, { color: colors.foreground }]}>{activity.title}</Text>
              <Text style={[styles.activityDescription, { color: colors.mutedForeground }]}>{activity.description}</Text>
              <View style={styles.activityBottom}>
                {activity.category ? (
                  <Text style={[styles.categoryText, { color: colors.primary }]}>{activity.category}</Text>
                ) : (
                  <View />
                )}
                <View style={[styles.statusPill, { backgroundColor: activity.status === 'Terminée' ? colors.greenSoft : activity.status === 'En attente' ? colors.muted : colors.orangeSoft }]}>
                  <Text style={[styles.statusText, { color: activity.status === 'Terminée' ? colors.success : activity.status === 'En attente' ? colors.mutedForeground : colors.warning }]}>
                    {activity.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </KeyboardAwareScrollViewCompat>

      <Pressable
        testID="toggle-activity-form"
        onPress={openAdd}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 88, opacity: pressed ? 0.8 : 1 }]}
      >
        <Feather name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAwareScrollViewCompat
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 60 }}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingId ? "Modifier l'activité" : 'Nouvelle activité'}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.blueSoft, borderColor: colors.primary + '33' }]}>
            <Feather name="info" size={13} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Les jours sans activité sont tout à fait normaux. Vous n’êtes pas obligé de saisir quelque chose chaque jour.
            </Text>
          </View>

          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Date</Text>
          <TextInput testID="activity-date" value={form.date} onChangeText={(v) => setForm((f) => ({ ...f, date: v }))} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />

          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Titre *</Text>
          <TextInput testID="activity-title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Ex. Préparation de la réunion client" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />

          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Description</Text>
          <TextInput testID="activity-description" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Décrivez brièvement ce qui a été réalisé…" placeholderTextColor={colors.mutedForeground} multiline style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />

          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Statut</Text>
          <View style={styles.chipWrap}>
            {statuses.map((item) => (
              <Pressable key={item} onPress={() => setForm((f) => ({ ...f, status: item }))} style={[styles.chip, { backgroundColor: form.status === item ? colors.greenSoft : colors.card, borderColor: form.status === item ? colors.success : colors.border }]}>
                <Text style={[styles.chipText, { color: form.status === item ? colors.success : colors.mutedForeground }]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable testID="save-activity" onPress={saveActivity} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
            <Feather name={editingId ? 'check-circle' : 'check'} size={17} color={colors.primaryForeground} />
            <Text style={styles.saveButtonText}>{editingId ? 'Enregistrer les modifications' : 'Enregistrer l’activité'}</Text>
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, marginBottom: 22 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, marginBottom: 7 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 7, maxWidth: 270 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, marginBottom: 12 },
  listTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  countBadge: { borderRadius: 12, minWidth: 26, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center' },
  countText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  activityCard: { borderWidth: 1, borderRadius: 18, padding: 15, marginHorizontal: 18, marginBottom: 11 },
  activityTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  activityDate: { flex: 1, fontSize: 11, fontFamily: 'Inter_500Medium' },
  activityActions: { flexDirection: 'row', gap: 7 },
  actionIconBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', lineHeight: 21 },
  activityDescription: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginTop: 6 },
  activityBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  categoryText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  statusPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 24, marginHorizontal: 18, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyText: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginTop: 7, maxWidth: 250 },
  emptyHint: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: 10, maxWidth: 230, fontStyle: 'italic' },
  fab: { position: 'absolute', right: 22, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  closeBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  infoBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 18 },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  inputLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 7, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 13, fontSize: 13, fontFamily: 'Inter_400Regular' },
  textArea: { minHeight: 78, paddingTop: 13, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  saveButton: { minHeight: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
});