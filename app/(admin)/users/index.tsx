import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { UserCard } from '@/components/admin/UserCard';
import { TempPasswordModal } from '@/components/admin/TempPasswordModal';
import { AdminService } from '@/services/admin';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { UserProfile, AppRole } from '@/types';
import { confirmAction, showAlert } from '@/utils/alert';
import { Search, UserPlus, Filter, X } from 'lucide-react-native';

export default function AdminUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Temp Password Modal state
  const [tempModalVisible, setTempModalVisible] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [selectedTargetUser, setSelectedTargetUser] = useState<UserProfile | null>(null);

  const loadUsers = async () => {
    const list = await AdminService.getAllUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel(`rt:admin_users:${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
          },
          () => {
            loadUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleResetPassword = async (targetUser: UserProfile) => {
    confirmAction({
      title: 'Réinitialiser le mot de passe',
      message: `Un nouveau mot de passe temporaire sera généré pour ${targetUser.full_name}. Il sera affiché une seule fois.`,
      confirmText: 'Générer',
      onConfirm: async () => {
        const res = await AdminService.resetUserPassword(targetUser.id);
        if (res.success && res.temporaryPassword) {
          setTempPassword(res.temporaryPassword);
          setSelectedTargetUser(targetUser);
          setTempModalVisible(true);
          await loadUsers();
        } else {
          showAlert('Erreur', res.error || 'Impossible de réinitialiser le mot de passe.');
        }
      },
    });
  };

  const handleToggleActive = async (targetUser: UserProfile) => {
    if (targetUser.id === currentUser?.id) {
      showAlert('Action interdite', 'Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }

    const nextState = !targetUser.is_active;
    const actionLabel = nextState ? 'Activer' : 'Désactiver';

    confirmAction({
      title: `${actionLabel} le compte`,
      message: `Confirmez-vous la modification du statut de ${targetUser.full_name} ?`,
      confirmText: actionLabel,
      destructive: !nextState,
      onConfirm: async () => {
        const res = await AdminService.toggleUserActiveStatus(targetUser.id, nextState);
        if (res.success) {
          setUsers((prev) =>
            prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextState } : u))
          );
        } else {
          showAlert('Erreur', res.error || 'Erreur lors de la modification.');
        }
      },
    });
  };

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.job_title && u.job_title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <View style={styles.container}>
      {/* Search & Header */}
      <View style={styles.topHeader}>
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.textSecondary} />
          <TextInput
            placeholder="Rechercher par nom, email, département..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(admin)/users/create')}
          activeOpacity={0.8}
        >
          <UserPlus size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Role Filter Pills */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterPill, roleFilter === 'all' && styles.filterPillActive]}
            onPress={() => setRoleFilter('all')}
          >
            <Text style={[styles.filterText, roleFilter === 'all' && styles.filterTextActive]}>
              Tous ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, roleFilter === 'collaborateur' && styles.filterPillActive]}
            onPress={() => setRoleFilter('collaborateur')}
          >
            <Text style={[styles.filterText, roleFilter === 'collaborateur' && styles.filterTextActive]}>
              Collaborateurs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, roleFilter === 'directeur_admin' && styles.filterPillActive]}
            onPress={() => setRoleFilter('directeur_admin')}
          >
            <Text style={[styles.filterText, roleFilter === 'directeur_admin' && styles.filterTextActive]}>
              Direction
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, roleFilter === 'super_admin' && styles.filterPillActive]}
            onPress={() => setRoleFilter('super_admin')}
          >
            <Text style={[styles.filterText, roleFilter === 'super_admin' && styles.filterTextActive]}>
              Super Admin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'active' && styles.filterPillActive]}
            onPress={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          >
            <Text style={[styles.filterText, statusFilter === 'active' && styles.filterTextActive]}>
              Actifs uniquement
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Users List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun collaborateur trouvé.</Text>
          </View>
        ) : (
          filteredUsers.map((targetUser) => (
            <UserCard
              key={`user-${targetUser.id}`}
              user={targetUser}
              onPress={() =>
                router.push({
                  pathname: '/(admin)/users/[id]',
                  params: { id: targetUser.id },
                })
              }
              onResetPassword={() => handleResetPassword(targetUser)}
              onToggleActive={() => handleToggleActive(targetUser)}
            />
          ))
        )}
      </ScrollView>

      {/* Single-use Temporary Password Modal */}
      {selectedTargetUser && (
        <TempPasswordModal
          visible={tempModalVisible}
          temporaryPassword={tempPassword}
          userName={selectedTargetUser.full_name}
          userEmail={selectedTargetUser.email}
          onClose={() => {
            setTempModalVisible(false);
            setTempPassword('');
            setSelectedTargetUser(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  filterBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

