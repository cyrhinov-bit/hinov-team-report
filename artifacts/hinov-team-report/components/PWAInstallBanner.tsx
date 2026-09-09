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

export function PWAInstallBanner() {
  const { canInstall, isIOS, hasNativePrompt, promptInstall, dismissBanner } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (Platform.OS !== 'web' || !canInstall) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowGuideModal(true);
      return;
    }
    const result = await promptInstall();
    if (result === 'manual') {
      setShowGuideModal(true);
    }
  };


  return (
    <>
      <View style={styles.bannerContainer}>
        <View style={styles.bannerContent}>
          {/* Logo / Badge de l'App */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="cellphone-arrow-down" size={22} color="#FFFFFF" />
          </View>

          {/* Textes d'information */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Installer HINOV Team Report</Text>
            <Text style={styles.subtitle}>
              Ajoutez l'application sur votre écran d'accueil pour un accès direct et hors-ligne.
            </Text>
          </View>

          {/* Bouton d'action Installer */}
          <TouchableOpacity
            style={styles.installButton}
            onPress={handleInstallClick}
            activeOpacity={0.85}
          >
            <Feather name="download" size={15} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.installButtonText}>Installer</Text>
          </TouchableOpacity>

          {/* Bouton pour fermer la bannière */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={dismissBanner}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Feather name="x" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal d'instructions pour navigateur */}
      <Modal
        visible={showGuideModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuideModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isIOS ? 'Installer sur iPhone / iPad' : "Installer l'application"}
              </Text>
              <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {isIOS
                ? 'Pour installer l’application sur votre écran d’accueil iOS :'
                : 'Pour installer l’application sur votre appareil :'}
            </Text>

            {isIOS ? (
              <>
                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Appuyez sur le bouton de partage{' '}
                    <Ionicons name="share-outline" size={18} color="#2563EB" /> dans Safari.
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
              </>
            ) : (
              <>
                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Cliquez sur l'icône <Text style={styles.stepBold}>« Installer » ⊕</Text> dans la barre d'adresse de votre navigateur (Chrome / Edge).
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Ou ouvrez le menu du navigateur (⋮) puis choisissez <Text style={styles.stepBold}>« Installer HINOV Team Report »</Text>.
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowGuideModal(false)}
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
  bannerContainer: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    zIndex: 9999,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  installButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 10,
  },
  btnIcon: {
    marginRight: 6,
  },
  installButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    padding: 6,
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
    maxWidth: 420,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
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
