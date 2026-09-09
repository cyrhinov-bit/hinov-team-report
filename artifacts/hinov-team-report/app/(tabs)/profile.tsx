import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const logo = require('@/assets/images/htr-logo.jpeg');

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useAppState();
  const { logout } = useAuth();
  const [fullName, setFullName] = useState(profile.fullName);
  const [role, setRole] = useState(profile.role);
  const [department, setDepartment] = useState(profile.department);

  useEffect(() => {
    setFullName(profile.fullName);
    setRole(profile.role);
    setDepartment(profile.department);
  }, [profile.fullName, profile.role, profile.department]);

  const save = () => {
    if (!fullName.trim()) {
      Alert.alert('Nom manquant', 'Ajoutez votre nom complet pour continuer.');
      return;
    }
    updateProfile({ fullName: fullName.trim(), role: role.trim(), department: department.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Profil enregistré', 'Vos informations ont bien été mises à jour.');
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Accès à la galerie refusé', 'Autorisez l’accès à vos photos pour choisir une photo de profil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const permanentUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      updateProfile({ avatarUri: permanentUri });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter de votre compte HTR ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.replace('/login');
          },
        },
      ],
    );
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
        <View style={styles.headerActions}>
          <Pressable
            testID="header-logout-button"
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.headerLogoutBtn,
              { backgroundColor: colors.orangeSoft, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name="log-out" size={17} color={colors.warning} />
          </Pressable>
        </View>
      </View>

      <View style={styles.identity}>
        <View style={[styles.avatarFrame, { borderColor: colors.border }]}>
          <Image source={profile.avatarUri ? { uri: profile.avatarUri } : logo} style={styles.avatar} />
          <Pressable testID="edit-avatar" onPress={choosePhoto} style={[styles.editAvatar, { backgroundColor: colors.primary }]}>
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
      </View>

      <PWAInstallButton variant="card" />

      <Pressable
        testID="ai-settings-link"
        onPress={() => router.push('/ai-settings')}
        style={({ pressed }) => [styles.aiCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={[styles.securityIcon, { backgroundColor: colors.purpleSoft }]}>
          <Feather name="zap" size={18} color={colors.ai} />
        </View>
        <View style={styles.securityCopy}>
          <Text style={[styles.securityTitle, { color: colors.foreground }]}>Paramètres IA</Text>
          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>Connectez votre propre clé Gemini.</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>

      {profile.role?.toUpperCase() === 'SUPERADMIN' ? (
        <Pressable
          testID="app-settings-superadmin-link"
          onPress={() => router.push({ pathname: '/users', params: { openSettings: 'true' } })}
          style={({ pressed }) => [
            styles.aiCard,
            { backgroundColor: colors.card, borderColor: colors.warning, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <View style={[styles.securityIcon, { backgroundColor: colors.orangeSoft }]}>
            <Feather name="sliders" size={18} color={colors.warning} />
          </View>
          <View style={styles.securityCopy}>
            <Text style={[styles.securityTitle, { color: colors.foreground }]}>Paramètres de l'application</Text>
            <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
              Bannière d'en-tête du PDF, nom d'entreprise et mentions.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : null}

      <Pressable
        testID="logout-button"
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <View style={[styles.logoutIconWrap, { backgroundColor: colors.orangeSoft }]}>
          <Feather name="log-out" size={18} color={colors.warning} />
        </View>
        <View style={styles.logoutCopy}>
          <Text style={[styles.logoutTitle, { color: colors.foreground }]}>Se déconnecter</Text>
          <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>Fermer votre session sur cet appareil.</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, marginBottom: 21 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerLogoutBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, padding: 2 },
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
  aiCard: { borderWidth: 1, borderRadius: 18, marginHorizontal: 18, marginTop: 13, padding: 14, flexDirection: 'row', alignItems: 'center' },
  securityIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  securityCopy: { flex: 1, marginLeft: 11 },
  securityTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  securityText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  logoutButton: { borderWidth: 1, borderRadius: 18, marginHorizontal: 18, marginTop: 13, padding: 14, flexDirection: 'row', alignItems: 'center' },
  logoutIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoutCopy: { flex: 1, marginLeft: 11 },
  logoutTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  logoutText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
});