import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ActivitiesService } from '@/services/activities';
import { ActivityStatus } from '@/types';
import { FRENCH_DAYS, getWeekNumber, getWeekRange } from '@/utils/date';
import { Check, Clock, AlertCircle, ArrowLeft, CheckCircle2, Plus } from 'lucide-react-native';

export default function NewActivityScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ date?: string; dayOfWeek?: string }>();

  const { week, year } = getWeekNumber();
  const weekRange = getWeekRange(week, year);

  const initialDayOfWeek = params.dayOfWeek
    ? Number(params.dayOfWeek)
    : new Date().getDay() === 0
    ? 5
    : Math.min(new Date().getDay(), 5);

  const initialMatchedDay = weekRange.days.find((d) => d.dayOfWeek === initialDayOfWeek);
  const [date, setDate] = useState(params.date || initialMatchedDay?.dateStr || new Date().toISOString().split('T')[0]);
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialDayOfWeek);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Général');
  const [status, setStatus] = useState<ActivityStatus>('terminee');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const categories = ['Général', 'Développement', 'Réunion', 'Sécurité', 'Support', 'Gestion de projet'];

  const handleSelectDay = (selectedKey: number) => {
    setDayOfWeek(selectedKey);
    const matched = weekRange.days.find((d) => d.dayOfWeek === selectedKey);
    if (matched) {
      setDate(matched.dateStr);
    }
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      setErrorMsg('Veuillez renseigner le titre de l’activité.');
      setSuccessMsg('');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await ActivitiesService.createActivity({
      user_id: user.id,
      date,
      day_of_week: dayOfWeek,
      title: title.trim(),
      description: description.trim(),
      category,
      status,
    });

    setLoading(false);

    if (res.activity) {
      const savedTitle = title.trim();
      setSavedCount((c) => c + 1);
      setSuccessMsg(`Activité "${savedTitle}" enregistrée avec succès !`);
      setTitle('');
      setDescription('');
      setErrorMsg('');
    } else {
      setErrorMsg(res.error || 'Erreur lors de l’enregistrement de l’activité.');
      setSuccessMsg('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Navigation / Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={COLORS.textPrimary} />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          {savedCount > 0 && (
            <View style={styles.sessionBadge}>
              <CheckCircle2 size={14} color="#16A34A" />
              <Text style={styles.sessionBadgeText}>
                {savedCount} activité{savedCount > 1 ? 's' : ''} ajoutée{savedCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {Boolean(successMsg) && (
          <View style={styles.successBox}>
            <CheckCircle2 size={18} color="#16A34A" style={{ marginTop: 1 }} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.successTitle}>Enregistrement réussi</Text>
              <Text style={styles.successText}>{successMsg}</Text>
              <Text style={styles.successSub}>
                Vous pouvez saisir une nouvelle activité ci-dessous ou quitter avec le bouton Retour.
              </Text>
            </View>
          </View>
        )}

        {Boolean(errorMsg) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Day Selector */}
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

        {/* Form Inputs */}
        <Input
          label="Titre de l'activité *"
          placeholder="Ex : Revue de code et merge request backend"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setErrorMsg('');
            if (successMsg) setSuccessMsg('');
          }}
        />

        <Input
          label="Description / Détails"
          placeholder="Détaillez les actions concrètes réalisées, points abordés ou livrables..."
          value={description}
          onChangeText={(d) => {
            setDescription(d);
            if (successMsg) setSuccessMsg('');
          }}
          multiline
          numberOfLines={4}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        {/* Category Pills */}
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

        {/* Status Selector */}
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

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="ENREGISTRER L'ACTIVITÉ"
            onPress={handleSave}
            loading={loading}
            variant="primary"
            size="lg"
            style={{ width: '100%' }}
            icon={<Plus size={18} color="#FFFFFF" />}
          />

          <Button
            title="RETOUR / TERMINER"
            onPress={() => router.back()}
            variant="outline"
            size="md"
            style={{ width: '100%', marginTop: 10 }}
            icon={<ArrowLeft size={16} color={COLORS.primary} />}
          />
        </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  sessionBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  successText: {
    fontSize: 12.5,
    color: '#15803D',
    fontWeight: '600',
    marginBottom: 2,
  },
  successSub: {
    fontSize: 11,
    color: '#166534',
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
});

