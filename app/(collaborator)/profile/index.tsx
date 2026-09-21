import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { confirmAction } from '@/utils/alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Camera,
  Lock,
  Sparkles,
  LogOut,
  ChevronRight,
  Shield,
  Mail,
  Building,
  Briefcase,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, uploadAvatar, logout } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'L’accès à la caméra est nécessaire pour prendre une photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'L’accès à la galerie est nécessaire pour choisir une photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploading(true);
        // Compress & resize image to 300x300 for optimal PDF rendering and low footprint
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 300, height: 300 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipResult.base64) {
          const ok = await uploadAvatar(manipResult.base64);
          if (ok) {
            Alert.alert('Photo mise à jour', 'Votre photo de profil a été mise à jour et sera automatiquement intégrée dans vos rapports PDF.');
          } else {
            Alert.alert('Erreur', 'Impossible de sauvegarder la photo.');
          }
        }
        setUploading(false);
      }
    } catch (err: any) {
      setUploading(false);
      Alert.alert('Erreur', err.message || 'Erreur de sélection d’image');
    }
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'web') {
      handlePickImage(false);
    } else {
      Alert.alert(
        'Photo de Profil',
        'Votre photo sera automatiquement intégrée à l’en-tête de vos rapports hebdomadaires PDF.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Prendre une photo', onPress: () => handlePickImage(true) },
          { text: 'Choisir depuis la galerie', onPress: () => handlePickImage(false) },
        ]
      );
    }
  };

  const handleLogout = () => {
    confirmAction({
      title: 'Déconnexion',
      message: 'Voulez-vous vraiment vous déconnecter de votre session ?',
      confirmText: 'Déconnexion',
      destructive: true,
      onConfirm: async () => {
        await logout();
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Top Profile Card */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <Avatar
            url={user?.avatar_url}
            name={user?.full_name || 'U'}
            size={90}
            showBorder
          />
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={showPhotoOptions}
            disabled={uploading}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Camera size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.jobTitle}>{user?.job_title || 'Fonction non définie'}</Text>

        <View style={{ marginTop: 8 }}>
          <Badge label={user?.role || 'collaborateur'} role={user?.role} />
        </View>
      </View>

      {/* Profile Details Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Informations Personnelles</Text>

        <View style={styles.infoRow}>
          <Mail size={16} color={COLORS.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Email Professionnel</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Briefcase size={16} color={COLORS.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Intitulé de Poste</Text>
            <Text style={styles.infoValue}>{user?.job_title || 'Non renseigné'}</Text>
          </View>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Building size={16} color={COLORS.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Département / Direction</Text>
            <Text style={styles.infoValue}>{user?.department || 'HINOV Group'}</Text>
          </View>
        </View>
      </View>

      {/* Settings Navigation Menu */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Paramètres & Sécurité</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(collaborator)/profile/security')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Lock size={18} color={COLORS.primaryAccent} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Modifier mon mot de passe</Text>
            <Text style={styles.menuSub}>Gestion de vos identifiants d'accès</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomWidth: 0 }]}
          onPress={() => router.push('/(collaborator)/profile/gemini-settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBox, { backgroundColor: COLORS.aiLight }]}>
            <Sparkles size={18} color={COLORS.ai} />
          </View>
          <View style={styles.menuContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.menuTitle}>Clé API Gemini AI</Text>
              {user?.custom_gemini_api_key ? (
                <View style={[styles.miniStatusBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.miniStatusText, { color: '#16A34A' }]}>Active</Text>
                </View>
              ) : (
                <View style={[styles.miniStatusBadge, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.miniStatusText, { color: '#64748B' }]}>Clé globale</Text>
                </View>
              )}
            </View>
            <Text style={styles.menuSub}>
              {user?.custom_gemini_api_key
                ? 'Clé personnelle enregistrée et active'
                : 'Renseignez votre clé personnelle ou utilisez celle du groupe'}
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Admin Quick Menu (for Super Admin & Director) */}
      {(user?.role === 'super_admin' || user?.role === 'directeur_admin') && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Espace Administration</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(admin)/users')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Shield size={18} color={COLORS.primaryAccent} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Gestion des Utilisateurs</Text>
              <Text style={styles.menuSub}>Créer, modifier les fonctions et gérer les accès</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Briefcase size={18} color={COLORS.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Supervision des Rapports</Text>
              <Text style={styles.menuSub}>Consulter et télécharger les rapports d'équipe</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/(admin)')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: COLORS.aiLight }]}>
              <Sparkles size={18} color={COLORS.ai} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Tableau de Bord Direction</Text>
              <Text style={styles.menuSub}>Vue d'ensemble et relances</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Logout Action */}
      <Button
        title="DÉCONNEXION"
        onPress={handleLogout}
        variant="danger"
        style={{ width: '100%', marginTop: 8 }}
        icon={<LogOut size={16} color="#FFFFFF" />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primaryAccent,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  jobTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoCol: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  miniStatusBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

