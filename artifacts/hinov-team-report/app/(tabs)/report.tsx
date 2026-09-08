import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const logo = require('@/assets/images/htr-logo.jpeg');

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activities, profile, difficulties, perspectives, setDifficulties, setPerspectives } = useAppState();
  const [isImproved, setIsImproved] = useState(false);
  const grouped = useMemo(() => {
    const byDay = new Map<string, typeof activities>();
    activities.forEach((activity) => {
      const dayIndex = Math.min(Math.max(new Date(`${activity.date}T12:00:00`).getDay() - 1, 0), 4);
      const day = weekDays[dayIndex];
      byDay.set(day, [...(byDay.get(day) ?? []), activity]);
    });
    return byDay;
  }, [activities]);

  const improveWriting = () => {
    if (!difficulties.trim() && !perspectives.trim()) {
      Alert.alert('Ajoutez du contenu', 'Écrivez au moins une difficulté ou une perspective avant de demander une amélioration.');
      return;
    }
    if (difficulties.trim()) setDifficulties(`${difficulties.trim().replace(/\.$/, '')}. Une attention particulière sera portée au suivi et à la résolution de ce point.`);
    if (perspectives.trim()) setPerspectives(`${perspectives.trim().replace(/\.$/, '')}. Cette priorité sera suivie dès le début de la prochaine semaine.`);
    setIsImproved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <Text style={[styles.eyebrow, { color: colors.ai }]}>DOCUMENT DE LA SEMAINE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Mon rapport</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Du 08 au 12 septembre 2026</Text>
        </View>
        <View style={styles.headerActions}>
          <Image source={profile.avatarUri ? { uri: profile.avatarUri } : logo} style={[styles.headerAvatar, { borderColor: colors.border }]} />
          <View style={[styles.statusPill, { backgroundColor: colors.orangeSoft }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.statusText, { color: colors.warning }]}>Brouillon</Text>
          </View>
        </View>
      </View>

      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.progressTop}>
          <View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>ÉTAT DE PRÉPARATION</Text>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>{activities.length} activité{activities.length > 1 ? 's' : ''} intégrée{activities.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.reportIcon, { backgroundColor: colors.purpleSoft }]}>
            <Feather name="file-text" size={19} color={colors.ai} />
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <View style={[styles.trackFill, { backgroundColor: colors.ai, width: difficulties || perspectives ? '78%' : '45%' }]} />
        </View>
        <Text style={[styles.progressHint, { color: colors.mutedForeground }]}>{difficulties || perspectives ? 'Presque prêt à être relu' : 'Ajoutez vos difficultés et perspectives'}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activités par jour</Text>
      {weekDays.map((day) => {
        const dayActivities = grouped.get(day) ?? [];
        return (
          <View key={day} style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, { color: colors.foreground }]}>{day}</Text>
              <Text style={[styles.dayCount, { color: dayActivities.length ? colors.primary : colors.mutedForeground }]}>{dayActivities.length} activité{dayActivities.length > 1 ? 's' : ''}</Text>
            </View>
            {dayActivities.length ? dayActivities.map((activity) => (
              <View key={activity.id} style={styles.reportActivity}>
                <View style={[styles.reportBullet, { backgroundColor: colors.primary }]} />
                <View style={styles.reportActivityCopy}>
                  <Text style={[styles.reportActivityTitle, { color: colors.foreground }]}>{activity.title}</Text>
                  <Text style={[styles.reportActivityDescription, { color: colors.mutedForeground }]}>{activity.description}</Text>
                </View>
              </View>
            )) : (
              <Text style={[styles.emptyDay, { color: colors.mutedForeground }]}>Aucune activité enregistrée</Text>
            )}
          </View>
        );
      })}

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bilan de la semaine</Text>
        <Pressable
          testID="improve-report"
          onPress={improveWriting}
          style={({ pressed }) => [styles.aiButton, { backgroundColor: colors.purpleSoft, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name="zap" size={14} color={colors.ai} />
          <Text style={[styles.aiButtonText, { color: colors.ai }]}>Améliorer</Text>
        </Pressable>
      </View>
      {isImproved ? <Text style={[styles.improvedNote, { color: colors.success }]}>Suggestion améliorée appliquée à votre brouillon.</Text> : null}
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Difficultés rencontrées</Text>
      <TextInput
        testID="difficulties-input"
        value={difficulties}
        onChangeText={setDifficulties}
        multiline
        placeholder="Décrivez les points qui ont ralenti votre semaine..."
        placeholderTextColor={colors.mutedForeground}
        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
      />
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Perspectives et priorités</Text>
      <TextInput
        testID="perspectives-input"
        value={perspectives}
        onChangeText={setPerspectives}
        multiline
        placeholder="Quelles sont vos priorités pour la semaine prochaine ?"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
      />
      <Pressable
        testID="preview-report"
        onPress={() => Alert.alert('Rapport prêt', 'La prévisualisation PDF sera disponible après validation du contenu.')}
        style={({ pressed }) => [styles.previewButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
      >
        <Feather name="eye" size={17} color={colors.primaryForeground} />
        <Text style={styles.previewText}>Prévisualiser mon rapport</Text>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, marginBottom: 22 },
  headerActions: { alignItems: 'flex-end', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, padding: 2 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, marginBottom: 7 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 7 },
  statusPill: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  progressCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginHorizontal: 18, marginBottom: 26 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  progressTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 6 },
  reportIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 18 },
  trackFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 9 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', marginHorizontal: 22, marginBottom: 12 },
  dayCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginHorizontal: 18, marginBottom: 10 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dayName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  dayCount: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  reportActivity: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  reportBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, marginRight: 9 },
  reportActivityCopy: { flex: 1 },
  reportActivityTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  reportActivityDescription: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: 3 },
  emptyDay: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 7 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  aiButton: { flexDirection: 'row', gap: 6, alignItems: 'center', marginRight: 18, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 },
  aiButtonText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  improvedNote: { fontSize: 11, fontFamily: 'Inter_500Medium', marginHorizontal: 22, marginTop: -3, marginBottom: 7 },
  inputLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginHorizontal: 22, marginTop: 8, marginBottom: 7 },
  textArea: { borderWidth: 1, borderRadius: 14, minHeight: 86, marginHorizontal: 18, paddingHorizontal: 13, paddingTop: 12, fontSize: 12, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' },
  previewButton: { minHeight: 50, borderRadius: 14, marginHorizontal: 18, marginTop: 22, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  previewText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
});