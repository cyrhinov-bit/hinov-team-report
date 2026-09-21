import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TempPasswordModal } from '@/components/admin/TempPasswordModal';
import { AdminService } from '@/services/admin';
import { AppRole, UserProfile } from '@/types';
import { isValidEmail } from '@/utils/validation';
import { AVAILABLE_JOB_TITLES, AVAILABLE_DEPARTMENTS } from '@/constants/organization';
import { UserPlus, Mail, Briefcase, Building, Shield } from 'lucide-react-native';

export default function CreateUserScreen() {
  const { user: currentUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<AppRole>('collaborateur');
  const [isActive, setIsActive] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Temp Password Modal
  const [tempModalVisible, setTempModalVisible] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const handleCreate = async () => {
    if (!fullName.trim()) {
      setErrorMsg('Veuillez renseigner le nom complet.');
      return;
    }

    if (!isValidEmail(email.trim())) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await AdminService.createUser({
      fullName: fullName.trim(),
      email: email.trim(),
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      role,
      isActive,
      mustChangePassword,
    });

    setLoading(false);

    if (res.success && res.temporaryPassword && res.user) {
      setTempPassword(res.temporaryPassword);
      setCreatedUser(res.user);
      setTempModalVisible(true);
    } else {
      setErrorMsg(res.error || 'Erreur lors de la création du compte.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <UserPlus size={28} color={COLORS.primaryAccent} />
          </View>

          <Text style={styles.title}>Nouveau Collaborateur</Text>
          <Text style={styles.subtitle}>
            Création d'un profil HTR avec génération automatique d'un mot de passe temporaire sécurisé.
          </Text>

          {Boolean(errorMsg) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Input
            label="Nom complet *"
            placeholder="Ex : Koffi Kouamé"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              setErrorMsg('');
            }}
          />

          <Input
            label="Email Professionnel *"
            placeholder="k.kouame@hinovgroup.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrorMsg('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={18} color={COLORS.textSecondary} />}
          />

          <Input
            label="Fonction / Intitulé du Poste *"
            placeholder="Sélectionnez ou saisissez la fonction..."
            value={jobTitle}
            onChangeText={setJobTitle}
            leftIcon={<Briefcase size={18} color={COLORS.textSecondary} />}
          />
          <View style={styles.suggestionsContainer}>
            {AVAILABLE_JOB_TITLES.map((func) => (
              <TouchableOpacity
                key={func}
                style={[styles.suggestionChip, jobTitle === func && styles.suggestionChipActive]}
                onPress={() => {
                  setJobTitle(func);
                  if (!department) {
                    if (func === 'Agent commercial') setDepartment('Commercial');
                    else if (func === 'Responsable imprimerie') setDepartment('Imprimerie');
                    else if (func === 'Responsable librairie et papeterie') setDepartment('Librairie et Papeterie');
                    else if (func === 'Responsable réseau et câblage') setDepartment('Réseau et Câblage');
                    else if (func === 'Responsable développement') setDepartment('Développement & Informatique');
                  }
                }}
              >
                <Text style={[styles.suggestionChipText, jobTitle === func && styles.suggestionChipTextActive]}>
                  {func}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Département / Direction"
            placeholder="Sélectionnez ou saisissez le département..."
            value={department}
            onChangeText={setDepartment}
            leftIcon={<Building size={18} color={COLORS.textSecondary} />}
          />
          <View style={styles.suggestionsContainer}>
            {AVAILABLE_DEPARTMENTS.map((dep) => (
              <TouchableOpacity
                key={dep}
                style={[styles.suggestionChip, department === dep && styles.suggestionChipActive]}
                onPress={() => setDepartment(dep)}
              >
                <Text style={[styles.suggestionChipText, department === dep && styles.suggestionChipTextActive]}>
                  {dep}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Role Selection */}
          <Text style={styles.sectionLabel}>Rôle attribué :</Text>
          <View style={styles.roleGrid}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'collaborateur' && styles.roleBtnActive]}
              onPress={() => setRole('collaborateur')}
            >
              <Text style={[styles.roleBtnTitle, role === 'collaborateur' && styles.roleBtnTitleActive]}>
                Collaborateur
              </Text>
              <Text style={styles.roleBtnDesc}>Espace personnel & rapports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === 'directeur_admin' && styles.roleBtnActive]}
              onPress={() => setRole('directeur_admin')}
            >
              <Text style={[styles.roleBtnTitle, role === 'directeur_admin' && styles.roleBtnTitleActive]}>
                Directeur / Admin
              </Text>
              <Text style={styles.roleBtnDesc}>Mon Espace + Supervision</Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity
                style={[styles.roleBtn, role === 'super_admin' && styles.roleBtnActiveAi]}
                onPress={() => setRole('super_admin')}
              >
                <Text style={[styles.roleBtnTitle, role === 'super_admin' && { color: COLORS.ai }]}>
                  Super Admin
                </Text>
                <Text style={styles.roleBtnDesc}>Contrôle système total</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Account Options */}
          <View style={styles.optionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Compte Actif</Text>
              <Text style={styles.optionSub}>Autorise l'accès à la plateforme</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: COLORS.border, true: COLORS.primaryAccent }}
            />
          </View>

          <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Changement de mot de passe obligatoire</Text>
              <Text style={styles.optionSub}>Force la mise à jour à la première connexion</Text>
            </View>
            <Switch
              value={mustChangePassword}
              onValueChange={setMustChangePassword}
              trackColor={{ false: COLORS.border, true: COLORS.primaryAccent }}
            />
          </View>

          <Button
            title="CRÉER LE COMPTE"
            onPress={handleCreate}
            loading={loading}
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: 20 }}
          />
        </View>
      </ScrollView>

      {/* Single-use Temporary Password Modal */}
      {createdUser && (
        <TempPasswordModal
          visible={tempModalVisible}
          temporaryPassword={tempPassword}
          userName={createdUser.full_name}
          userEmail={createdUser.email}
          onClose={() => {
            setTempModalVisible(false);
            router.back();
          }}
        />
      )}
    </KeyboardAvoidingView>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12.5,
    color: COLORS.danger,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 6,
  },
  roleGrid: {
    gap: 8,
    marginBottom: 16,
  },
  roleBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 10,
  },
  roleBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primaryAccent,
  },
  roleBtnActiveAi: {
    backgroundColor: COLORS.aiLight,
    borderColor: COLORS.ai,
  },
  roleBtnTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  roleBtnTitleActive: {
    color: COLORS.primaryAccent,
  },
  roleBtnDesc: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  optionSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -8,
    marginBottom: 14,
  },
  suggestionChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primaryAccent,
  },
  suggestionChipText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  suggestionChipTextActive: {
    color: COLORS.primaryAccent,
    fontWeight: '700',
  },
});

