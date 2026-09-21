import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { COLORS } from '@/constants/colors';
import { AlertTriangle, Plus, Trash2, Edit3, Check } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';

interface DifficultySectionProps {
  key?: React.Key;
  difficulties: string[];
  onChange: (items: string[]) => void;
  readOnly?: boolean;
}

export const DifficultySection: React.FC<DifficultySectionProps> = ({
  difficulties,
  onChange,
  readOnly = false,
}) => {
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onChange([...difficulties, newItem.trim()]);
    setNewItem('');
  };

  const handleRemove = (index: number) => {
    onChange(difficulties.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(difficulties[index]);
  };

  const saveEdit = () => {
    if (editingIndex === null || !editText.trim()) return;
    const updated = [...difficulties];
    updated[editingIndex] = editText.trim();
    onChange(updated);
    setEditingIndex(null);
    setEditText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.titleWithIcon}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Difficultés Rencontrées</Text>
        </View>
        <Text style={styles.badgeCount}>{difficulties.length}</Text>
      </View>

      <Text style={styles.subtitle}>
        Avez-vous rencontré des obstacles, blocages ou dépendances cette semaine ?
      </Text>

      {difficulties.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Aucune difficulté signalée. (Facultatif)
          </Text>
        </View>
      ) : (
        difficulties.map((item, idx) => (
          <View key={`diff-${idx}`} style={styles.itemRow}>
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
                <Text style={styles.bullet}>⚠</Text>
                <Text style={styles.itemText}>{item}</Text>
                {!readOnly && (
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => startEdit(idx)}
                      style={styles.actionBtn}
                    >
                      <Edit3 size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemove(idx)}
                      style={styles.actionBtn}
                    >
                      <Trash2 size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        ))
      )}

      {!readOnly && (
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Ajouter une difficulté rencontrée..."
            placeholderTextColor={COLORS.textMuted}
            value={newItem}
            onChangeText={setNewItem}
            style={styles.textInput}
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            onPress={handleAdd}
            style={[styles.addBtn, !newItem.trim() && styles.disabledBtn]}
            disabled={!newItem.trim()}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  badgeCount: {
    backgroundColor: COLORS.warningLight,
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 12.5,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  bullet: {
    color: '#D97706',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  itemActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionBtn: {
    padding: 4,
    marginLeft: 4,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderFocus,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: COLORS.primaryAccent,
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  addBtn: {
    backgroundColor: COLORS.primaryAccent,
    padding: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  disabledBtn: {
    backgroundColor: COLORS.surfaceMuted,
  },
});

