import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { COLORS, SHADOWS } from '@/constants/colors';
import { Target, Plus, Trash2, Edit3, Check } from 'lucide-react-native';

interface PerspectiveSectionProps {
  key?: React.Key;
  perspectives: string[];
  onChange: (items: string[]) => void;
  readOnly?: boolean;
}

export const PerspectiveSection: React.FC<PerspectiveSectionProps> = ({
  perspectives,
  onChange,
  readOnly = false,
}) => {
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onChange([...perspectives, newItem.trim()]);
    setNewItem('');
  };

  const handleRemove = (index: number) => {
    onChange(perspectives.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(perspectives[index]);
  };

  const saveEdit = () => {
    if (editingIndex === null || !editText.trim()) return;
    const updated = [...perspectives];
    updated[editingIndex] = editText.trim();
    onChange(updated);
    setEditingIndex(null);
    setEditText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Target size={16} color={COLORS.primaryAccent} />
          </View>
          <Text style={styles.sectionTitle}>Perspectives & Priorités (S+1)</Text>
        </View>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeText}>{perspectives.length}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Objectifs majeurs, projets à initier ou livrables prévus pour la semaine suivante.
      </Text>

      {perspectives.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Aucune perspective définie. Saisissez vos priorités ci-dessous.
          </Text>
        </View>
      ) : (
        perspectives.map((item, idx) => (
          <View key={`persp-${idx}`} style={styles.itemRow}>
            {editingIndex === idx ? (
              <View style={styles.editRow}>
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  style={styles.editInput}
                  autoFocus
                />
                <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
                  <Check size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.bulletDot} />
                <Text style={styles.itemText}>{item}</Text>
                {!readOnly && (
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => startEdit(idx)}
                      style={styles.actionBtn}
                    >
                      <Edit3 size={13} color={COLORS.primaryAccent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemove(idx)}
                      style={[styles.actionBtn, { borderColor: '#FADBD8' }]}
                    >
                      <Trash2 size={13} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        ))
      )}

      {!readOnly && (
        <View style={styles.addRow}>
          <TextInput
            placeholder="Ajouter une priorité ou perspective pour la semaine prochaine..."
            placeholderTextColor={COLORS.textMuted}
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={handleAdd}
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.addBtn, !newItem.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newItem.trim()}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Ajouter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.primaryAccent,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: COLORS.infoLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryAccent,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  emptyBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceMuted,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceMuted,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryAccent,
    marginRight: 10,
  },
  itemText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: COLORS.primaryAccent,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 6,
    padding: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceSubtle,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 14,
    borderRadius: 6,
    gap: 4,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
