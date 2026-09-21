import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ActivitiesService } from '@/services/activities';
import { ActivityStatus, Activity } from '@/types';
import { FRENCH_DAYS, getWeekNumber, getWeekRange } from '@/utils/date';
import { Check, Clock, AlertCircle, Lock } from 'lucide-react-native';

export default function EditActivityScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { week, year } = getWeekNumber();
  const weekRange = getWeekRange(week, year);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Général');
  const [status, setStatus] = useState<ActivityStatus>('terminee');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const categories = ['Général', 'Développement', 'Réunion', 'Sécurité', 'Support', 'Gestion de projet'];

  useEffect(() => {
    const fetchAct = async () => {
      if (!user || !id) return;
      const acts = await ActivitiesService.getActivitiesForUser(user.id);
      const found = acts.find((a) => a.id === id);
      if (found) {
        setActivity(found);
        setDate(found.date);
        setDayOfWeek(found.day_of_week || 1);
        setTitle(found.title);
        setDescription(found.description || '');
        setCategory(found.category || 'Général');
        setStatus(found.status);
      }
    };
    fetchAct();
  }, [id, user]);

  const handleSelectDay = (selectedKey: number) => {
    setDayOfWeek(selectedKey);
    const matched = weekRange.days.find((d) => d.dayOfWeek === selectedKey);
    if (matched) {
      setDate(matched.dateStr);
    }
  };

  const handleSave = async () => {
    if (!id || !title.trim()) {
      setErrorMsg('Veuillez renseigner le titre de l’activité.');
      return;
    }

    if (activity?.is_locked) {
      setErrorMsg('Cette activité est verrouillée et ne peut plus être modifiée.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await ActivitiesService.updateActivity(id, {
      date,
      day_of_week: dayOfWeek,
      title: title.trim(),
      description: description.trim(),
      category,
      status,
    });

    setLoading(false);

    if (res.success) {
      router.back();
    } else {
      setErrorMsg(res.error || 'Erreur lors de la mise à jour de l’activité.');
    }
  };

  if (activity?.is_locked) {
    return (
      <View style={styles.lockedContainer}>
        <Lock size={40} color={COLORS.danger} />
        <Text style={styles.lockedTitle}>Activité Verrouillée</Text>
        <Text style={styles.lockedText}>
          Cette activité est incluse dans un rapport hebdomadaire déjà validé et soumis au Directeur. Elle est protégée contre toute modification.
        </Text>
        <Button
          title="RETOUR"
          onPress={() => router.back()}
          variant="outline"
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {Boolean(errorMsg) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Jour de la semaine :</Text>
        <View style={styles.daysRow}>
          {FRENCH_DAYS.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={[styles.dayBtn, dayOfWeek === d.key && styles.dayBtnActive]}
              onPress={() => handleSelectDay(d.key)}
            >
              <Text style={[styles.dayBtnText, dayOfWeek === d.key && styles.dayBtnTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Titre de l'activité *"
          placeholder="Ex : Réunion d'alignement technique"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setErrorMsg('');
          }}
        />

        <Input
          label="Description / Détails"
          placeholder="Détaillez les actions concrètes..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <Text style={styles.sectionLabel}>Catégorie :</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catPill, category === cat && styles.catPillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Statut d'avancement :</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[styles.statusBtn, status === 'terminee' && styles.statusTermineeActive]}
            onPress={() => setStatus('terminee')}
          >
            <Check size={16} color={status === 'terminee' ? '#166534' : COLORS.textSecondary} />
            <Text style={[styles.statusBtnText, status === 'terminee' && { color: '#166534', fontWeight: '700' }]}>
              Terminée
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusBtn, status === 'en_cours' && styles.statusEnCoursActive]}
            onPress={() => setStatus('en_cours')}
          >
            <Clock size={16} color={status === 'en_cours' ? '#92400E' : COLORS.textSecondary} />
            <Text style={[styles.statusBtnText, status === 'en_cours' && { color: '#92400E', fontWeight: '700' }]}>
              En cours
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusBtn, status === 'en_attente' && styles.statusAttenteActive]}
            onPress={() => setStatus('en_attente')}
          >
            <AlertCircle size={16} color={status === 'en_attente' ? '#1E293B' : COLORS.textSecondary} />
            <Text style={[styles.statusBtnText, status === 'en_attente' && { color: '#1E293B', fontWeight: '700' }]}>
              En attente
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="ENREGISTRER LES MODIFICATIONS"
          onPress={handleSave}
          loading={loading}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginTop: 24 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 14,
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
    fontSize: 13,
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
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  dayBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dayBtnTextActive: {
    color: '#FFFFFF',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  catPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primaryAccent,
  },
  catText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  catTextActive: {
    color: COLORS.primaryAccent,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  statusTermineeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  statusEnCoursActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  statusAttenteActive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#64748B',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

