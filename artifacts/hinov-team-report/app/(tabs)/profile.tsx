import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

const logo = require('@/assets/images/htr-logo.jpeg');

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useAppState();
  const [fullName, setFullName] = useState(profile.fullName);
  const [role, setRole] = useState(profile.role);
  const [department, setDepartment] = useState(profile.department);

  const save = () => {
    if (!fullName.trim()) {
      Alert.alert('Nom manquant', 'Ajoutez votre nom complet pour continuer.');
      return;
    }
    updateProfile({ fullName: fullName.trim(), role: role.trim(), department: department.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Profil enregistré', 'Vos informations ont bien été mises à jour.');
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
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MON ESPACE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Mon profil</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Gérez vos informations personnelles.</Text>
        </View>
        <Feather name="settings" size={21} color={colors.mutedForeground} />
      </View>

      <View style={styles.identity}>
        <View style={[styles.avatarFrame, { borderColor: colors.border }]}>
          <Image source={logo} style={styles.avatar} />
          <Pressable testID="edit-avatar" onPress={() => Alert.alert('Photo de profil', 'La sélection depuis la galerie sera disponible dans la prochaine version.')} style={[styles.editAvatar, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={13} color={colors.primaryForeground} />
          </Pressable>
        </View>
        <Text style={[styles.identityName, { color: colors.foreground }]}>{profile.fullName}</Text>
        <Text style={[styles.identityRole, { color: colors.mutedForeground }]}>{profile.role} · {profile.department}</Text>
      </View>

      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Informations personnelles</Text>
          <Feather name="user" size={17} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Nom complet</Text>
        <TextInput testID="profile-name" value={fullName} onChangeText={setFullName} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Fonction</Text>
        <TextInput testID="profile-role" value={role} onChangeText={setRole} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Département</Text>
        <TextInput testID="profile-department" value={department} onChangeText={setDepartment} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Email professionnel</Text>
        <View style={[styles.readOnlyInput, { borderColor: colors.input, backgroundColor: colors.muted }]}>
          <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>{profile.email}</Text>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
        </View>
        <Pressable testID="save-profile" onPress={save} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Feather name="check" size={17} color={colors.primaryForeground} />
          <Text style={styles.saveText}>Enregistrer les modifications</Text>
        </Pressable>
      </View>

      <View style={[styles.securityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.securityIcon, { backgroundColor: colors.greenSoft }]}>
          <Feather name="shield" size={18} color={colors.success} />
        </View>
        <View style={styles.securityCopy}>
          <Text style={[styles.securityTitle, { color: colors.foreground }]}>Sécurité du compte</Text>
          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>Votre espace est protégé par HINOV Group.</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, marginBottom: 21 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, marginBottom: 7 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 7 },
  identity: { alignItems: 'center', marginBottom: 24 },
  avatarFrame: { width: 94, height: 94, borderRadius: 47, borderWidth: 3, padding: 4, position: 'relative', backgroundColor: '#FFFFFF' },
  avatar: { width: '100%', height: '100%', borderRadius: 42 },
  editAvatar: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: -2, bottom: 1, borderWidth: 3, borderColor: '#F5F8FC' },
  identityName: { fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 12 },
  identityRole: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 5 },
  formCard: { borderWidth: 1, borderRadius: 20, marginHorizontal: 18, padding: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 13, marginBottom: 7 },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 13, fontFamily: 'Inter_400Regular' },
  readOnlyInput: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readOnlyText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  saveButton: { minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  saveText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  securityCard: { borderWidth: 1, borderRadius: 18, marginHorizontal: 18, marginTop: 13, padding: 14, flexDirection: 'row', alignItems: 'center' },
  securityIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  securityCopy: { flex: 1, marginLeft: 11 },
  securityTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  securityText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
});