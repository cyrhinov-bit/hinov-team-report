import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { usePWA } from '@/contexts/PWAContext';
import { COLORS } from '@/constants/colors';
import { Download, MonitorCheck, Smartphone } from 'lucide-react-native';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'banner';
  style?: any;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', style }) => {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [installing, setInstalling] = useState(false);

  // Only render on web platforms when not already running as standalone installed app
  if (Platform.OS !== 'web' || isInstalled) {
    return null;
  }

  const handlePress = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  if (variant === 'header') {
    return (
      <TouchableOpacity
        style={[styles.headerBtn, style]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={installing}
      >
        <Download size={14} color="#38BDF8" />
        <Text style={styles.headerBtnText}>
          {installing ? 'Installation...' : 'Installer'}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'card') {
    return (
      <TouchableOpacity
        style={[styles.cardBtn, style]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={installing}
      >
        <View style={styles.cardIconBox}>
          <Smartphone size={20} color="#0284C7" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Installer l'application web (PWA)</Text>
          <Text style={styles.cardSub}>
            Accédez à HTR directement depuis votre bureau ou écran d'accueil
          </Text>
        </View>
        <Download size={18} color="#0284C7" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.bannerContainer, style]}>
      <View style={styles.bannerLeft}>
        <MonitorCheck size={22} color="#38BDF8" />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.bannerTitle}>Installez Hinov Team Report</Text>
          <Text style={styles.bannerSub}>
            Profitez d'une expérience fluide en plein écran et des notifications directes
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.bannerBtn}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={installing}
      >
        <Download size={15} color="#FFFFFF" />
        <Text style={styles.bannerBtnText}>
          {installing ? 'En cours...' : 'Installer l\'App'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  headerBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B2240',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  bannerSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  bannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 6,
  },
});
