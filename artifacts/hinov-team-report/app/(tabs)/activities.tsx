import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ActivityStatus, useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

const categories = ['Coordination', 'Clients', 'Production', 'Administration'];
const statuses: ActivityStatus[] = ['Terminée', 'En cours', 'En attente'];

export default function ActivitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activities, addActivity, deleteActivity } = useAppState();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [status, setStatus] = useState<ActivityStatus>('Terminée');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const groupedActivities = useMemo(
    () => [...activities].sort((a, b) => b.date.localeCompare(a.date)),
    [activities],
  );

  const saveActivity = () => {
    if (!title.trim()) {
      Alert.alert('Titre manquant', 'Ajoutez un titre pour enregistrer cette activité.');
      return;
    }
    addActivity({
      date: selectedDate,
      title: title.trim(),
      description: description.trim() || 'Aucune description ajoutée.',
      category,
      status,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle('');
    setDescription('');
    setIsAdding(false);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 }}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>JOURNAL D’ACTIVITÉ</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Mes activités</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Capturez vos avancées au fil de la semaine.</Text>
        </View>
        <Pressable
          testID="toggle-activity-form"
          onPress={() => setIsAdding((current) => !current)}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name={isAdding ? 'x' : 'plus'} size={21} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isAdding ? (
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Nouvelle activité</Text>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Date</Text>
          <TextInput
            testID="activity-date"
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
          />
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Titre</Text>
          <TextInput
            testID="activity-title"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex. Préparation de la réunion client"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
          />
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Description</Text>
          <TextInput
            testID="activity-description"
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez brièvement ce qui a été réalisé..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
          />
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Catégorie</Text>
          <View style={styles.chipWrap}>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, { backgroundColor: category === item ? colors.blueSoft : colors.background, borderColor: category === item ? colors.primary : colors.border }]}
              >
                <Text style={[styles.chipText, { color: category === item ? colors.primary : colors.mutedForeground }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Statut</Text>
          <View style={styles.chipWrap}>
            {statuses.map((item) => (
              <Pressable
                key={item}
                onPress={() => setStatus(item)}
                style={[styles.chip, { backgroundColor: status === item ? colors.greenSoft : colors.background, borderColor: status === item ? colors.success : colors.border }]}
              >
                <Text style={[styles.chipText, { color: status === item ? colors.success : colors.mutedForeground }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            testID="save-activity"
            onPress={saveActivity}
            style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="check" size={17} color={colors.primaryForeground} />
            <Text style={styles.saveButtonText}>Enregistrer l’activité</Text>
          </Pressable>
        </View>
      ) : null}

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
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Ajoutez votre première activité pour commencer votre rapport.</Text>
        </View>
      ) : (
        groupedActivities.map((activity) => (
          <View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.activityTop}>
              <View style={[styles.categoryDot, { backgroundColor: activity.status === 'Terminée' ? colors.success : colors.warning }]} />
              <Text style={[styles.activityDate, { color: colors.mutedForeground }]}>{activity.date}</Text>
              <Pressable
                testID={`delete-${activity.id}`}
                onPress={() => Alert.alert('Supprimer cette activité ?', 'Cette action est définitive.', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => deleteActivity(activity.id) },
                ])}
              >
                <Feather name="more-horizontal" size={19} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.activityTitle, { color: colors.foreground }]}>{activity.title}</Text>
            <Text style={[styles.activityDescription, { color: colors.mutedForeground }]}>{activity.description}</Text>
            <View style={styles.activityBottom}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>{activity.category}</Text>
              <View style={[styles.statusPill, { backgroundColor: activity.status === 'Terminée' ? colors.greenSoft : colors.orangeSoft }]}>
                <Text style={[styles.statusText, { color: activity.status === 'Terminée' ? colors.success : colors.warning }]}>{activity.status}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginBottom: 22 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, marginBottom: 7 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 7, maxWidth: 270 },
  addButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  formCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginHorizontal: 18, marginBottom: 24 },
  formTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 17 },
  inputLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 7, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 13, fontSize: 13, fontFamily: 'Inter_400Regular' },
  textArea: { minHeight: 78, paddingTop: 13, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  saveButton: { minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  saveButtonText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, marginBottom: 12 },
  listTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  countBadge: { borderRadius: 12, minWidth: 26, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center' },
  countText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  activityCard: { borderWidth: 1, borderRadius: 18, padding: 15, marginHorizontal: 18, marginBottom: 11 },
  activityTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  activityDate: { flex: 1, fontSize: 11, fontFamily: 'Inter_500Medium' },
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
});