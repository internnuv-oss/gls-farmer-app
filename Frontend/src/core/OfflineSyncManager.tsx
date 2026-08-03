// Frontend/src/core/OfflineSyncManager.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, AppState, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNetInfo } from '@react-native-community/netinfo';
import { getPendingCount } from './database';
import { syncLocationsToSupabase } from './locationUtils';
import { Button } from '../design-system/components'; 
import { colors, radius, spacing } from '../design-system/tokens';

export const OfflineSyncManager = () => {
  const { t } = useTranslation();
  const netInfo = useNetInfo(); 
  
  const [visible, setVisible] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  // 🚀 Updated Threshold: Modal only considers popping up if > 50 points
  const SYNC_THRESHOLD = 50; 

  const checkQueue = () => {
    const count = getPendingCount();
    
    // 🚀 NEW CONDITION: Must have > 50 points AND be explicitly connected to the internet
    if (count > SYNC_THRESHOLD && netInfo.isConnected === true) {
      setQueueCount(count);
      setVisible(true);
    } 
    // Small queue (< 50) and online -> sync silently without bothering the user
    else if (count > 0 && netInfo.isConnected === true) {
      syncLocationsToSupabase();
      setVisible(false); // Ensure modal is closed
    } 
    // If they are offline (regardless of queue size), hide the modal so they can use the app
    else {
      setVisible(false);
    }
  };

  useEffect(() => {
    checkQueue();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkQueue();
      }
    });

    return () => subscription.remove();
  }, [netInfo.isConnected]); // Re-evaluates instantly if they turn data on/off

  const handleManualSync = async () => {
    setIsSyncing(true);
    setError('');
    
    try {
      await syncLocationsToSupabase();
      
      const remaining = getPendingCount();
      if (remaining === 0) {
        setVisible(false);
      } else {
        setError(t("Some locations couldn't be synced. The network might be unstable."));
        setQueueCount(remaining);
      }
    } catch (err) {
      setError(t("Sync failed. Please ensure you have a stable connection."));
    } finally {
      setIsSyncing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center' }}>
          
          <MaterialIcons 
            name="cloud-sync" 
            size={48} 
            color={colors.warning} 
            style={{ marginBottom: spacing.md }} 
          />
          
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: spacing.sm }}>
            {t("Offline Data Detected")}
          </Text>
          
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg, fontWeight: '600' }}>
            {t(`You have ${queueCount} un-synced location coordinates saved on your device. Please sync them to the cloud to ensure your travel distance is accurate.`)}
          </Text>

          {error ? (
            <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}

          <View style={{ width: '100%', marginBottom: spacing.sm }}>
            {isSyncing ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.md }}>
                <ActivityIndicator color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{t("Syncing to Cloud...")}</Text>
              </View>
            ) : (
              <Button 
                label={t("Sync Now")} 
                onPress={handleManualSync} 
                icon="cloud-upload" 
              />
            )}
          </View>
          
          {!isSyncing && (
             <Text 
               onPress={() => setVisible(false)} 
               style={{ marginTop: spacing.md, color: colors.textMuted, fontWeight: '700', fontSize: 13 }}
             >
               {t("Remind Me Later")}
             </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};