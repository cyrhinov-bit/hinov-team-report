import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

const logo = require('@/assets/images/htr-logo.jpeg');

function formatToday() {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activities, profile } = useAppState();
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = activities.filter((activity) => activity.date === today).length;
  const activeDays = new Set(activities.map((activity) => activity.date)).size;
  const firstName = profile.fullName.split(' ')[0];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 18,
        paddingBottom: insets.bottom + 112,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>ESPACE PERSONNEL</Text>
          <Text style={[styles.greeting, { color: colors.foreground }]}>Bonjour, {firstName}</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatToday()}</Text>
        </View>
        <Pressable
          testID="profile-button"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.avatarButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Image source={logo} style={styles.avatarImage} />
        </Pressable>
      </View>

      <LinearGradient
        colors={[colors.navy, '#1C4E82']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOrb} />
        <View style={styles.heroCopy}>
          <View style={styles.heroBadge}>
            <Feather name="bar-chart-2" size={13} color={colors.warning} />
            <Text style={styles.heroBadgeText}>SUIVI HEBDOMADAIRE</Text>
          </View>
          <Text style={styles.heroTitle}>Votre semaine,{"\n"}en un coup d’œil.</Text>
          <Text style={styles.heroCaption}>Gardez le fil de vos avancées et préparez un rapport qui vous ressemble.</Text>
        </View>
        <View style={styles.heroRing}>
          <Text style={styles.heroRingNumber}>{activeDays}</Text>
          <Text style={styles.heroRingLabel}>jours actifs</Text>
        </View>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aujourd’hui</Text>
        <Pressable onPress={() => router.push('/activities')} testID="see-activities">
          <Text style={[styles.link, { color: colors.primary }]}>Voir tout</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.blueSoft }]}>
            <Feather name="activity" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>{todayCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>activité{todayCount > 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.greenSoft }]}>
            <Feather name="trending-up" size={18} color={colors.success} />
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>{activeDays}/5</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>jours suivis</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Progression</Text>
        <Text style={[styles.weekLabel, { color: colors.mutedForeground }]}>Cette semaine</Text>
      </View>
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.progressTop}>
          <Text style={[styles.progressTitle, { color: colors.foreground }]}>Votre rythme</Text>
          <Text style={[styles.progressPercent, { color: colors.success }]}>{Math.min(activeDays * 20, 100)}%</Text>
        </View>
        <View style={styles.daysRow}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map((day, index) => {
            const active = index < activeDays;
            return (
              <View key={day} style={styles.dayItem}>
                <View style={[styles.dayDot, { backgroundColor: active ? colors.success : colors.muted }]}>
                  {active ? <Feather name="check" size={13} color={colors.card} /> : null}
                </View>
                <Text style={[styles.dayLabel, { color: active ? colors.foreground : colors.mutedForeground }]}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actions rapides</Text>
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          testID="add-activity"
          onPress={() => router.push('/activities')}
          style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.blueSoft, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name="plus" size={22} color={colors.primary} />
          <Text style={[styles.actionTitle, { color: colors.navy }]}>Ajouter une{"\n"}activité</Text>
          <Feather name="arrow-up-right" size={16} color={colors.primary} style={styles.actionArrow} />
        </Pressable>
        <Pressable
          testID="prepare-report"
          onPress={() => router.push('/report')}
          style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.purpleSoft, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name="file-text" size={20} color={colors.ai} />
          <Text style={[styles.actionTitle, { color: colors.navy }]}>Préparer mon{"\n"}rapport</Text>
          <Feather name="arrow-up-right" size={16} color={colors.ai} style={styles.actionArrow} />
        </Pressable>
      </View>
      <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>Votre rapport reste individuel et confidentiel.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 22 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 7 },
  greeting: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.7 },
  date: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 6, textTransform: 'capitalize' },
  avatarButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', padding: 3, borderWidth: 1, borderColor: '#DDE6F0' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 20 },
  hero: { minHeight: 182, marginHorizontal: 18, borderRadius: 24, padding: 22, overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between' },
  heroOrb: { position: 'absolute', width: 185, height: 185, borderRadius: 100, right: -54, top: -70, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroCopy: { flex: 1, paddingRight: 8 },
  heroBadge: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 14 },
  heroBadgeText: { color: '#CFE6FA', fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 23, fontFamily: 'Inter_700Bold', lineHeight: 28, letterSpacing: -0.5 },
  heroCaption: { color: '#B9D2EA', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginTop: 11, maxWidth: 210 },
  heroRing: { alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', width: 77, height: 77, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  heroRingNumber: { color: '#FFFFFF', fontSize: 24, fontFamily: 'Inter_700Bold' },
  heroRingLabel: { color: '#B9D2EA', fontSize: 9, fontFamily: 'Inter_500Medium', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  link: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  weekLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 18 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 15 },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  statNumber: { fontSize: 25, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
  progressCard: { marginHorizontal: 18, borderWidth: 1, borderRadius: 18, padding: 16 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  progressPercent: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dayItem: { alignItems: 'center', gap: 7 },
  dayDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 18 },
  actionCard: { flex: 1, minHeight: 114, borderRadius: 18, padding: 15, justifyContent: 'space-between' },
  actionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', lineHeight: 19, marginTop: 10 },
  actionArrow: { position: 'absolute', right: 14, top: 15 },
  footerNote: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 28, paddingHorizontal: 20 },
});