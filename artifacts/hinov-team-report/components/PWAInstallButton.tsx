import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'card' | 'button';
}

export function PWAInstallButton({ variant = 'card' }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (Platform.OS !== 'web') {
    return null;
  }

  const handlePress = async () => {
    if (isInstalled) return;
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await promptInstall();
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <TouchableOpacity
          style={[styles.cardContainer, isInstalled && styles.cardInstalled]}
          onPress={handlePress}
          disabled={isInstalled}
          activeOpacity={0.8}
        >
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={isInstalled ? 'check-decagram' : 'cellphone-arrow-down'}
              size={22}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={styles.cardTitle}>
              {isInstalled ? 'Application installée' : "Installer l'application"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isInstalled
                ? 'Fonctionne comme une app native sur votre appareil'
                : 'Ajouter sur votre écran d’accueil pour un accès rapide'}
            </Text>
          </View>
          {!isInstalled && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Installer</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.simpleButton, isInstalled && styles.buttonDisabled]}
          onPress={handlePress}
          disabled={isInstalled}
          activeOpacity={0.8}
        >
          <Feather
            name={isInstalled ? 'check' : 'download'}
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.simpleButtonText}>
            {isInstalled ? 'App installée' : "Installer l'application"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal d'instructions pour iOS */}
      <Modal
        visible={showIOSModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIOSModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Installer sur iPhone / iPad</Text>
              <TouchableOpacity onPress={() => setShowIOSModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Pour ajouter l'application sur votre écran d'accueil iOS :
            </Text>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Appuyez sur le bouton de partage{' '}
                <Ionicons name="share-outline" size={18} color="#2563EB" /> dans la barre de Safari.
              </Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Faites défiler vers le bas et appuyez sur{' '}
                <Text style={styles.stepBold}>« Sur l'écran d'accueil » ⊞</Text>.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowIOSModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>Compris !</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
  },
  cardInstalled: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  badge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  simpleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#10B981',
  },
  simpleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    maxWidth: 400,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  stepBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  modalButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

