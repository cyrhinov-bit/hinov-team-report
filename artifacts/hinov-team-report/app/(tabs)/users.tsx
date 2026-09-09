import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { AdminUser, AppSettings, AdminCollaboratorReport, apiRequest } from '@/lib/api';
import { exportAndShareReportPdf } from '@/lib/pdf';
import { getCurrentWeekRange, dateToWeekDay, WEEK_DAYS } from '@/lib/constants';

type RoleOption = 'COLLABORATEUR' | 'ADMIN' | 'SUPERADMIN';

const roles: RoleOption[] = ['COLLABORATEUR', 'ADMIN', 'SUPERADMIN'];

const departments = [
  'Développement',
  'Direction',
  'Commercial & Marketing',
  'Ressources Humaines',
  'Finance & Comptabilité',
  'Support & Opérations',
  'Design & Produit',
  'Général',
];

export default function UsersManagementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAppState();
  const { token } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('TOUS');

  // Collaborator Report View modal states (Director / Admin)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportUser, setSelectedReportUser] = useState<AdminUser | null>(null);
  const [collaboratorReportData, setCollaboratorReportData] = useState<AdminCollaboratorReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isExportingCollaboratorPdf, setIsExportingCollaboratorPdf] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form states (Add)
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDepartment, setNewDepartment] = useState('Développement');
  const [newRole, setNewRole] = useState<RoleOption>('COLLABORATEUR');
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states (Edit)
  const [editFullName, setEditFullName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<RoleOption>('COLLABORATEUR');
  const [customResetPassword, setCustomResetPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // App & PDF Settings state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('HINOV GROUP');
  const [pdfHeaderImage, setPdfHeaderImage] = useState<string | null>(null);
  const [pdfFooterText, setPdfFooterText] = useState("HINOV Team Report - Document Confidentiel d'Entreprise");
  const [primaryColor, setPrimaryColor] = useState('#1E3A8A');
  const [secondaryColor, setSecondaryColor] = useState('#4F46E5');
  const [savingSettings, setSavingSettings] = useState(false);
  const params = useLocalSearchParams<{ openSettings?: string }>();

  useEffect(() => {
    if (params.openSettings === 'true') {
      setIsSettingsModalOpen(true);
    }
  }, [params.openSettings]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<AdminUser[]>('/api/admin/users', { token });
      setUsers(data);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchAppSettings = useCallback(async () => {
    if (!token) return;
    try {
      const settings = await apiRequest<AppSettings>('/api/app-settings', { token });
      if (settings) {
        setCompanyName(settings.companyName || 'HINOV GROUP');
        setPdfHeaderImage(settings.pdfHeaderImage || null);
        setPdfFooterText(settings.pdfFooterText || "HINOV Team Report - Document Confidentiel d'Entreprise");
        setPrimaryColor(settings.primaryColor || '#1E3A8A');
        setSecondaryColor(settings.secondaryColor || '#4F46E5');
      }
    } catch {
      // Ignored
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
    fetchAppSettings();
  }, [fetchUsers, fetchAppSettings]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiRequest('/api/app-settings', {
        method: 'POST',
        token,
        body: {
          companyName: companyName.trim(),
          pdfHeaderImage,
          pdfFooterText: pdfFooterText.trim(),
          primaryColor,
          secondaryColor,
        },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Paramètres enregistrés', 'Les paramètres de marque et la bannière du PDF ont été mis à jour.');
      setIsSettingsModalOpen(false);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible d’enregistrer les paramètres.');
    } finally {
      setSavingSettings(false);
    }
  };

  const pickHeaderBanner = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l’accès aux photos pour choisir la bannière du PDF.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      allowsEditing: true,
      aspect: [16, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const imageUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setPdfHeaderImage(imageUri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // KPIs
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length;
  const collabCount = users.filter((u) => u.role === 'COLLABORATEUR').length;
  const deptCount = new Set(users.map((u) => u.department).filter(Boolean)).size;

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoleFilter === 'TOUS' ||
        u.role.toUpperCase() === selectedRoleFilter.toUpperCase();

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter]);

  // Handle Add User
  const handleCreateUser = async () => {
    setAddError(null);
    if (!newFullName.trim() || !newEmail.trim()) {
      setAddError('Veuillez saisir le nom complet et l’adresse email.');
      return;
    }
    setSubmitting(true);
    const passToSend = newPassword.trim() || 'Hinov2026!';
    try {
      const createdRes = await apiRequest<{ temporaryPassword?: string }>('/api/admin/users', {
        method: 'POST',
        token,
        body: {
          fullName: newFullName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: passToSend,
          department: newDepartment,
          role: newRole,
        },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const usedPassword = createdRes?.temporaryPassword || passToSend;
      setIsAddModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setAddError(null);
      setSuccessToast(`Compte créé pour ${newFullName} ! Mot de passe : ${usedPassword}`);
      Alert.alert(
        'Compte créé avec succès',
        `Le collaborateur ${newFullName} peut maintenant se connecter avec :\n\nEmail : ${newEmail.trim().toLowerCase()}\nMot de passe : ${usedPassword}`,
      );
      fetchUsers();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Une erreur est survenue lors de la création.';
      setAddError(msg);
      Alert.alert('Échec de création', msg);
    } finally {
      setSubmitting(false);
    }
  };


  // Open Collaborator Report (Director / Admin)
  const openCollaboratorReport = async (user: AdminUser) => {
    setSelectedReportUser(user);
    setCollaboratorReportData(null);
    setIsReportModalOpen(true);
    setLoadingReport(true);
    try {
      const weekRange = getCurrentWeekRange();
      const data = await apiRequest<AdminCollaboratorReport>(
        `/api/admin/users/${user.id}/report?week_start=${weekRange.start}`,
        { token }
      );
      setCollaboratorReportData(data);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de récupérer le rapport de ce collaborateur.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportCollaboratorPdf = async () => {
    if (!collaboratorReportData) return;
    setIsExportingCollaboratorPdf(true);
    try {
      const weekRange = getCurrentWeekRange();
      const start = new Date(`${weekRange.start}T12:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 4);
      const weekLabel = `Du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;

      await exportAndShareReportPdf({
        profile: {
          fullName: collaboratorReportData.profile.fullName,
          email: collaboratorReportData.profile.email,
          department: collaboratorReportData.profile.department,
          role: collaboratorReportData.profile.role,
          avatarUri: collaboratorReportData.profile.avatarUri,
        },
        weekLabel,
        weekStart: weekRange.start,
        activities: collaboratorReportData.activities,
        difficulties: collaboratorReportData.report.difficulties || '',
        perspectives: collaboratorReportData.report.perspectives || '',
        appSettings: {
          id: 'default',
          companyName,
          pdfFooterText,
          primaryColor,
          secondaryColor,
          pdfHeaderImage,
        },
      });
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Erreur de génération', error instanceof Error ? error.message : 'Impossible de générer le document PDF.');
    } finally {
      setIsExportingCollaboratorPdf(false);
    }
  };

  // Open Edit Modal
  const openEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditDepartment(user.department);
    setEditRole(user.role);
    setCustomResetPassword('');
    setIsEditModalOpen(true);
  };

  // Handle Reset User Password
  const handleResetUserPassword = async () => {
    if (!selectedUser) return;
    const passToSet = customResetPassword.trim() || 'Hinov2026!';
    setResettingPassword(true);
    try {
      const res = await apiRequest<{ temporaryPassword?: string; message?: string }>(
        `/api/admin/users/${selectedUser.id}/reset-password`,
        {
          method: 'POST',
          token,
          body: { password: passToSet },
        }
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const finalPass = res?.temporaryPassword || passToSet;
      setCustomResetPassword('');
      Alert.alert(
        'Mot de passe réinitialisé',
        `Le mot de passe de ${selectedUser.fullName} a été mis à jour avec succès.\n\nNouveau mot de passe : ${finalPass}\n\nTransmettez ce mot de passe au collaborateur.`
      );
      setSuccessToast(`Mot de passe réinitialisé pour ${selectedUser.fullName} : ${finalPass}`);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setResettingPassword(false);
    }
  };

  // Handle Save Edit
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        token,
        body: {
          fullName: editFullName.trim(),
          department: editDepartment.trim(),
          role: editRole,
        },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', 'Les modifications ont été enregistrées.');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de modifier cet utilisateur.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = (user: AdminUser) => {
    if (user.id === profile.email || user.fullName === profile.fullName) {
      Alert.alert('Action interdite', 'Vous ne pouvez pas supprimer votre propre compte administrateur.');
      return;
    }

    const performDelete = async () => {
      try {
        await apiRequest(`/api/admin/users/${user.id}`, { method: 'DELETE', token });
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        fetchUsers();
      } catch (error) {
        Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer cet utilisateur.');
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.fullName} (${user.email}) ? Cette action est irréversible.`)
        : true;
      if (ok) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      'Supprimer cet utilisateur ?',
      `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.fullName} (${user.email}) ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: performDelete,
        },
      ],
    );
  };

  const isSuperAdmin = profile.role === 'SUPERADMIN';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.roleBadgeHeader}>
              <Feather name="shield" size={12} color={colors.warning} />
              <Text style={[styles.eyebrow, { color: colors.warning }]}>
                {isSuperAdmin ? 'SUPERADMINISTRATION' : 'ADMINISTRATION'}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Gestion d’équipe</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Supervisez les accès, rôles et paramètres de marque.
            </Text>
          </View>
          <View style={styles.headerBtnGroup}>
            <Pressable
              testID="settings-app-button"
              onPress={() => setIsSettingsModalOpen(true)}
              style={({ pressed }) => [
                styles.settingsButton,
                { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="sliders" size={16} color={colors.foreground} />
              <Text style={[styles.settingsButtonText, { color: colors.foreground }]}>Marque</Text>
            </Pressable>

            <Pressable
              testID="add-user-button"
              onPress={() => setIsAddModalOpen(true)}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="user-plus" size={16} color={colors.primaryForeground} />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </Pressable>
          </View>
        </View>

        {successToast ? (
          <View style={styles.successToastBox}>
            <Feather name="check-circle" size={16} color="#059669" />
            <Text style={styles.successToastText}>{successToast}</Text>
            <Pressable onPress={() => setSuccessToast(null)} hitSlop={8}>
              <Feather name="x" size={14} color="#059669" />
            </Pressable>
          </View>
        ) : null}

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.blueSoft }]}>
              <Feather name="users" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.foreground }]}>{totalUsers}</Text>
            <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Membres</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.orangeSoft }]}>
              <Feather name="shield" size={16} color={colors.warning} />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.foreground }]}>{adminCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Admins</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.greenSoft }]}>
              <Feather name="user-check" size={16} color={colors.success} />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.foreground }]}>{collabCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Collabs</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.purpleSoft }]}>
              <Feather name="grid" size={16} color={colors.ai} />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.foreground }]}>{deptCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Pôles</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.input }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            testID="search-users"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher par nom, email ou pôle..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['TOUS', 'COLLABORATEUR', 'ADMIN', 'SUPERADMIN'].map((filter) => {
            const active = selectedRoleFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedRoleFilter(filter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {filter === 'TOUS' ? 'Tous' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* User Cards List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Utilisateurs ({filteredUsers.length})
            </Text>
            <Pressable onPress={fetchUsers} disabled={loading} hitSlop={10}>
              <Feather name="refresh-cw" size={15} color={colors.primary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Chargement des comptes...
              </Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="user-x" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun utilisateur trouvé</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Essayez d’ajuster votre recherche ou vos filtres.
              </Text>
            </View>
          ) : (
            filteredUsers.map((user) => {
              const isSuper = user.role === 'SUPERADMIN';
              const isAdmin = user.role === 'ADMIN';

              const roleBg = isSuper
                ? colors.orangeSoft
                : isAdmin
                ? colors.blueSoft
                : colors.muted;

              const roleColor = isSuper
                ? colors.warning
                : isAdmin
                ? colors.primary
                : colors.mutedForeground;

              const initials = user.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <View
                  key={user.id}
                  style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.userCardTop}>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.blueSoft }]}>
                      <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                    </View>
                    <View style={styles.userMainInfo}>
                      <Text style={[styles.userName, { color: colors.foreground }]}>{user.fullName}</Text>
                      <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
                        {user.email || 'Email non renseigné'}
                      </Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
                      {isSuper ? <Feather name="shield" size={11} color={roleColor} style={{ marginRight: 4 }} /> : null}
                      <Text style={[styles.roleBadgeText, { color: roleColor }]}>{user.role}</Text>
                    </View>
                  </View>

                  <View style={[styles.userMetaRow, { borderColor: colors.border }]}>
                    <View style={styles.deptBadge}>
                      <Feather name="briefcase" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.deptText, { color: colors.mutedForeground }]}>{user.department}</Text>
                    </View>
                    <View style={styles.actionsGroup}>
                      <Pressable
                        testID={`view-report-user-${user.id}`}
                        onPress={() => openCollaboratorReport(user)}
                        style={({ pressed }) => [
                          styles.reportActionBtn,
                          { backgroundColor: colors.purpleSoft, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Feather name="file-text" size={13} color={colors.ai} />
                        <Text style={[styles.reportActionBtnText, { color: colors.ai }]}>Rapport</Text>
                      </Pressable>

                      <Pressable
                        testID={`edit-user-${user.id}`}
                        onPress={() => openEdit(user)}
                        style={({ pressed }) => [
                          styles.actionIconBtn,
                          { backgroundColor: colors.blueSoft, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Feather name="edit-2" size={14} color={colors.primary} />
                      </Pressable>
                      {isSuperAdmin ? (
                        <Pressable
                          testID={`delete-user-${user.id}`}
                          onPress={() => handleDeleteUser(user)}
                          style={({ pressed }) => [
                            styles.actionIconBtn,
                            { backgroundColor: '#FDE8E8', opacity: pressed ? 0.7 : 1 },
                          ]}
                        >
                          <Feather name="trash-2" size={14} color="#E02424" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal : Ajouter un Utilisateur */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouveau collaborateur</Text>
              <Pressable onPress={() => setIsAddModalOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {addError ? (
              <View style={styles.errorBannerBox}>
                <Feather name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{addError}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nom complet *</Text>
              <TextInput
                testID="new-user-fullname"
                value={newFullName}
                onChangeText={setNewFullName}
                placeholder="Ex: Jean DUPONT"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email professionnel *</Text>
              <TextInput
                testID="new-user-email"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="jean.dupont@hinov.group"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Mot de passe initial</Text>
              <TextInput
                testID="new-user-password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Par défaut : Hinov2026!"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={false}
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
              />
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4, marginBottom: 12 }}>
                Laisser vide pour utiliser le mot de passe par défaut (Hinov2026!)
              </Text>


              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Département / Pôle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                {departments.map((dept) => {
                  const isSelected = newDepartment === dept;
                  return (
                    <Pressable
                      key={dept}
                      onPress={() => setNewDepartment(dept)}
                      style={[
                        styles.deptPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.muted,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deptPillText,
                          { color: isSelected ? colors.primaryForeground : colors.foreground },
                        ]}
                      >
                        {dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Rôle / Permissions</Text>
              <View style={styles.roleSelectionRow}>
                {roles.map((r) => {
                  const isSelected = newRole === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setNewRole(r)}
                      style={[
                        styles.roleSelectBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.muted,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleSelectText,
                          { color: isSelected ? colors.primaryForeground : colors.foreground },
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                testID="submit-create-user"
                onPress={handleCreateUser}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  { backgroundColor: colors.primary, opacity: submitting ? 0.6 : pressed ? 0.8 : 1 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Feather name="check" size={18} color={colors.primaryForeground} />
                    <Text style={styles.modalSubmitText}>Créer le compte</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal : Modifier un Utilisateur */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Modifier le collaborateur</Text>
              <Pressable onPress={() => setIsEditModalOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nom complet</Text>
              <TextInput
                value={editFullName}
                onChangeText={setEditFullName}
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Département / Pôle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                {departments.map((dept) => {
                  const isSelected = editDepartment === dept;
                  return (
                    <Pressable
                      key={dept}
                      onPress={() => setEditDepartment(dept)}
                      style={[
                        styles.deptPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.muted,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deptPillText,
                          { color: isSelected ? colors.primaryForeground : colors.foreground },
                        ]}
                      >
                        {dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Rôle / Permissions</Text>
              <View style={styles.roleSelectionRow}>
                {roles.map((r) => {
                  const isSelected = editRole === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setEditRole(r)}
                      style={[
                        styles.roleSelectBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.muted,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleSelectText,
                          { color: isSelected ? colors.primaryForeground : colors.foreground },
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Réinitialisation de mot de passe */}
              <View style={{ marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Feather name="key" size={14} color={colors.primary} />
                  <Text style={[styles.inputLabel, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>
                    Réinitialiser le mot de passe
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 8, lineHeight: 16 }}>
                  Définissez un mot de passe ou laissez vide pour utiliser <Text style={{ fontFamily: 'Inter_700Bold' }}>Hinov2026!</Text>
                </Text>
                <TextInput
                  value={customResetPassword}
                  onChangeText={setCustomResetPassword}
                  placeholder="Laisser vide pour Hinov2026!"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input, marginBottom: 10 }]}
                />
                <Pressable
                  testID="btn-reset-user-password"
                  onPress={handleResetUserPassword}
                  disabled={resettingPassword}
                  style={({ pressed }) => [
                    styles.resetPassBtn,
                    { backgroundColor: colors.muted, borderColor: colors.border, opacity: resettingPassword ? 0.6 : pressed ? 0.8 : 1 },
                  ]}
                >
                  {resettingPassword ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={14} color={colors.primary} />
                      <Text style={[styles.resetPassBtnText, { color: colors.primary }]}>
                        Réinitialiser l'accès du collaborateur
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              <Pressable
                testID="submit-update-user"
                onPress={handleUpdateUser}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  { backgroundColor: colors.primary, opacity: submitting ? 0.6 : pressed ? 0.8 : 1 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Feather name="check" size={18} color={colors.primaryForeground} />
                    <Text style={styles.modalSubmitText}>Enregistrer les modifications</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal : Paramètres d'Application & Image d'En-tête PDF */}
      <Modal visible={isSettingsModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Paramètres de Marque & PDF</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                  Personnalisez l’en-tête et les mentions officielles du document PDF
                </Text>
              </View>
              <Pressable onPress={() => setIsSettingsModalOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Prévisualisation En-tête PDF */}
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                APERÇU DE L’EN-TÊTE DU DOCUMENT PDF
              </Text>
              <View style={[styles.pdfPreviewBox, { borderColor: colors.border, backgroundColor: '#FFFFFF' }]}>
                {/* Bannière d'en-tête occupant 100% de la largeur */}
                <View style={[styles.bannerPreviewContainer, { backgroundColor: primaryColor }]}>
                  {pdfHeaderImage ? (
                    <Image
                      source={{ uri: pdfHeaderImage }}
                      style={styles.bannerPreviewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.bannerFallback}>
                      <Text style={styles.bannerFallbackTitle}>{companyName || 'HINOV GROUP'}</Text>
                      <Text style={styles.bannerFallbackSub}>DOCUMENT OFFICIEL D'ENTREPRISE</Text>
                    </View>
                  )}
                </View>

                {/* Simulation de la carte d'identité collaborateur avec photo de profil */}
                <View style={styles.simulatedUserCard}>
                  <View style={styles.simulatedLeft}>
                    <View style={[styles.simulatedAvatar, { borderColor: primaryColor }]}>
                      {profile.avatarUri ? (
                        <Image source={{ uri: profile.avatarUri }} style={styles.simulatedAvatarImg} />
                      ) : (
                        <Text style={[styles.simulatedAvatarText, { color: primaryColor }]}>
                          {(profile.fullName || 'EG').slice(0, 2).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.simulatedName}>{profile.fullName || 'Evariste GNONSKAN'}</Text>
                      <Text style={styles.simulatedDept}>
                        {profile.department || 'Développement'} • <Text style={{ color: primaryColor, fontWeight: '700' }}>{profile.role}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.simulatedRight}>
                    <Text style={[styles.simulatedBadge, { backgroundColor: '#EFF6FF', color: primaryColor }]}>
                      Rapport Hebdomadaire
                    </Text>
                  </View>
                </View>
              </View>

              {/* Boutons d'action pour la bannière */}
              <View style={styles.bannerActionsRow}>
                <Pressable
                  testID="pick-banner-btn"
                  onPress={pickHeaderBanner}
                  style={({ pressed }) => [
                    styles.bannerActionBtn,
                    { backgroundColor: colors.blueSoft, borderColor: colors.primary, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Feather name="image" size={16} color={colors.primary} />
                  <Text style={[styles.bannerActionText, { color: colors.primary }]}>
                    {pdfHeaderImage ? 'Changer la bannière' : 'Importer une bannière'}
                  </Text>
                </Pressable>

                {pdfHeaderImage ? (
                  <Pressable
                    testID="remove-banner-btn"
                    onPress={() => setPdfHeaderImage(null)}
                    style={({ pressed }) => [
                      styles.bannerActionBtn,
                      { backgroundColor: colors.orangeSoft, borderColor: colors.warning, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Feather name="trash-2" size={16} color={colors.warning} />
                    <Text style={[styles.bannerActionText, { color: colors.warning }]}>Réinitialiser</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4, lineHeight: 15 }}>
                💡 La bannière téléversée occupera automatiquement toute la largeur supérieure du document A4, tandis que la photo de profil du collaborateur restera parfaitement cadrée.
              </Text>

              {/* Paramètres de texte */}
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nom de l'entreprise</Text>
              <TextInput
                testID="settings-company-name"
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Ex: HINOV GROUP"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Mention de bas de page PDF</Text>
              <TextInput
                testID="settings-footer-text"
                value={pdfFooterText}
                onChangeText={setPdfFooterText}
                placeholder="Ex: HINOV Team Report - Document Confidentiel d'Entreprise"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Couleur principale des titres</Text>
              <View style={styles.colorPickerRow}>
                {[
                  { label: 'Bleu Nuit', hex: '#1E3A8A' },
                  { label: 'Indigo', hex: '#4F46E5' },
                  { label: 'Sarcelle', hex: '#0F766E' },
                  { label: 'Anthracite', hex: '#1E293B' },
                ].map((colorOpt) => {
                  const isSelected = primaryColor.toUpperCase() === colorOpt.hex.toUpperCase();
                  return (
                    <Pressable
                      key={colorOpt.hex}
                      onPress={() => setPrimaryColor(colorOpt.hex)}
                      style={[
                        styles.colorPill,
                        {
                          borderColor: isSelected ? colorOpt.hex : colors.border,
                          backgroundColor: isSelected ? colorOpt.hex : colors.muted,
                        },
                      ]}
                    >
                      <View style={[styles.colorDot, { backgroundColor: colorOpt.hex }]} />
                      <Text
                        style={[
                          styles.colorText,
                          { color: isSelected ? '#FFFFFF' : colors.foreground, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {colorOpt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                testID="save-app-settings-btn"
                onPress={handleSaveSettings}
                disabled={savingSettings}
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  { backgroundColor: colors.primary, opacity: savingSettings ? 0.6 : pressed ? 0.8 : 1 },
                ]}
              >
                {savingSettings ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Feather name="save" size={18} color={colors.primaryForeground} />
                    <Text style={styles.modalSubmitText}>Enregistrer la configuration</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal : Consultation & Téléchargement du Rapport Collaborateur (Direction) */}
      <Modal visible={isReportModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="file-text" size={16} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Rapport de {selectedReportUser?.fullName || 'Collaborateur'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                  {selectedReportUser?.department} • Semaine en cours
                </Text>
              </View>
              <Pressable onPress={() => setIsReportModalOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {loadingReport ? (
              <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                  Chargement du rapport hebdomadaire...
                </Text>
              </View>
            ) : collaboratorReportData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Statut du rapport */}
                <View style={[styles.reportSummaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, letterSpacing: 1 }}>
                        STATUT DU DOCUMENT
                      </Text>
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 2 }}>
                        {collaboratorReportData.report?.status === 'SUBMITTED' ? 'Validé & Transmis' : 'En cours de rédaction (Brouillon)'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadgePill,
                        {
                          backgroundColor:
                            collaboratorReportData.report?.status === 'SUBMITTED' ? '#DEF7EC' : colors.orangeSoft,
                        },
                      ]}
                    >
                      <Feather
                        name={collaboratorReportData.report?.status === 'SUBMITTED' ? 'check-circle' : 'clock'}
                        size={13}
                        color={collaboratorReportData.report?.status === 'SUBMITTED' ? '#03543F' : colors.warning}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: 'Inter_700Bold',
                          color:
                            collaboratorReportData.report?.status === 'SUBMITTED' ? '#03543F' : colors.warning,
                          marginLeft: 4,
                        }}
                      >
                        {collaboratorReportData.report?.status === 'SUBMITTED' ? 'Soumis' : 'Brouillon'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 6 }}>
                    Total : {collaboratorReportData.activities.length} activité{collaboratorReportData.activities.length > 1 ? 's' : ''} enregistrée{collaboratorReportData.activities.length > 1 ? 's' : ''} cette semaine.
                  </Text>
                </View>

                {/* Activités */}
                <Text style={[styles.inputLabel, { color: colors.foreground, fontSize: 13, marginTop: 14 }]}>
                  Activités de la semaine ({collaboratorReportData.activities.length})
                </Text>
                {collaboratorReportData.activities.length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center' }}>
                      Aucune activité renseignée pour cette semaine.
                    </Text>
                  </View>
                ) : (
                  collaboratorReportData.activities.map((act) => (
                    <View key={act.id} style={[styles.reportActivityItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
                          {act.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginLeft: 8 }}>
                          {act.date}
                        </Text>
                      </View>
                      {act.description ? (
                        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
                          {act.description}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <View style={[styles.microBadge, { backgroundColor: colors.blueSoft }]}>
                          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>
                            {act.category || 'Général'}
                          </Text>
                        </View>
                        <View style={[styles.microBadge, { backgroundColor: act.status === 'Terminée' ? '#DEF7EC' : colors.orangeSoft }]}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontFamily: 'Inter_600SemiBold',
                              color: act.status === 'Terminée' ? '#03543F' : colors.warning,
                            }}
                          >
                            {act.status || 'En cours'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}

                {/* Difficultés */}
                <Text style={[styles.inputLabel, { color: colors.foreground, fontSize: 13, marginTop: 14 }]}>
                  Difficultés & Points de blocage
                </Text>
                <View style={[styles.calloutCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                  <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
                    {collaboratorReportData.report?.difficulties?.trim() || 'Aucun point bloquant signalé.'}
                  </Text>
                </View>

                {/* Perspectives */}
                <Text style={[styles.inputLabel, { color: colors.foreground, fontSize: 13, marginTop: 14 }]}>
                  Perspectives & Priorités
                </Text>
                <View style={[styles.calloutCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={{ fontSize: 12, color: '#064E3B', lineHeight: 18 }}>
                    {collaboratorReportData.report?.perspectives?.trim() || 'Poursuite des activités en cours.'}
                  </Text>
                </View>

                {/* Bouton Téléchargement / Exportation PDF */}
                <Pressable
                  testID="btn-download-collaborator-pdf"
                  onPress={handleExportCollaboratorPdf}
                  disabled={isExportingCollaboratorPdf}
                  style={({ pressed }) => [
                    styles.modalSubmitBtn,
                    { backgroundColor: colors.primary, opacity: isExportingCollaboratorPdf ? 0.6 : pressed ? 0.8 : 1, marginTop: 20 },
                  ]}
                >
                  {isExportingCollaboratorPdf ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <>
                      <Feather name="download" size={18} color={colors.primaryForeground} />
                      <Text style={styles.modalSubmitText}>Télécharger le PDF officiel de ce collaborateur</Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  roleBadgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  headerBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingsButtonText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  kpiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginBottom: 18 },
  kpiCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiNumber: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  kpiLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 18,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  filterRow: { paddingHorizontal: 18, gap: 8, paddingBottom: 16 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  listSection: { paddingHorizontal: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 30, alignItems: 'center', gap: 8, marginTop: 10 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptySubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  userCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  userCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  userMainInfo: { flex: 1 },
  userName: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  userEmail: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  userMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  deptBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deptText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  actionsGroup: { flexDirection: 'row', gap: 8 },
  actionIconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  inputLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 12, marginBottom: 6 },
  modalInput: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 13, fontFamily: 'Inter_400Regular' },
  pillsScroll: { flexDirection: 'row', marginVertical: 4 },
  deptPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginRight: 8 },
  deptPillText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  roleSelectionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleSelectBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  roleSelectText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  resetPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    height: 42,
    marginTop: 2,
    marginBottom: 4,
  },
  resetPassBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  modalSubmitText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  pdfPreviewBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerPreviewContainer: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerPreviewImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerFallbackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  bannerFallbackSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  simulatedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  simulatedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  simulatedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  simulatedAvatarImg: {
    width: '100%',
    height: '100%',
  },
  simulatedAvatarText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  simulatedName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  simulatedDept: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
  },
  simulatedRight: {
    alignItems: 'flex-end',
  },
  simulatedBadge: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  bannerActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bannerActionText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  colorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  errorBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginVertical: 10,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  successToastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 14,
  },
  successToastText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  reportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
  },
  reportActionBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  reportSummaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginTop: 6,
  },
  reportActivityItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  microBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  calloutCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
});

