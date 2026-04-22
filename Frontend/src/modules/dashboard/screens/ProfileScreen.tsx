import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../design-system/components/Button';
import { fetchNetworkSummary } from '../services/dashboardService';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';

export const ProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ dealers: 0, farmers: 0, distributors: 0 });

  const loadCounts = async () => {
    if (!user?.id) return;
    try {
      const data = await fetchNetworkSummary(user.id);
      setCounts(data);
    } catch (error) {
      console.error("Failed to load network summary", error);
    }
  };

  // Automatically refresh counts when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCounts();
    setRefreshing(false);
  };

  const changeLanguage = (lng: string) => { i18n.changeLanguage(lng); };

  const StatBox = ({ title, count, icon, color }: any) => (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', ...shadows.soft }}>
      <MaterialIcons name={icon} size={28} color={color} style={{ marginBottom: 8 }} />
      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{count}</Text>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 4, textTransform: 'uppercase', textAlign: 'center' }}>{title}</Text>
    </View>
  );

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: 60, backgroundColor: colors.screen }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
    >
      <Text style={{ fontSize: 24, fontWeight: '900', marginBottom: spacing.xl }}>{t('Profile')}</Text>

      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
          <MaterialIcons name="person" size={40} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900' }}>{user?.name || 'Sales Executive'}</Text>
        <Text style={{ color: colors.textMuted, fontWeight: '600', marginTop: 4 }}>{user?.mobile ? `+91 ${user.mobile}` : 'No mobile registered'}</Text>
      </View>

      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted, marginBottom: spacing.md, textTransform: 'uppercase' }}>{t('My Network Summary')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
        <StatBox title={t('Dealers')} count={counts.dealers} icon="storefront" color={colors.primary} />
        <StatBox title={t('Farmers')} count={counts.farmers} icon="agriculture" color={colors.success} />
        <StatBox title={t('Distributors')} count={counts.distributors} icon="domain" color={colors.warning} />
      </View>

      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted, marginBottom: spacing.md, textTransform: 'uppercase' }}>{t('Change Language')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] }}>
        {['en', 'gu', 'hi'].map((lng) => (
          <Pressable key={lng} onPress={() => changeLanguage(lng)} style={{ flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: i18n.language === lng ? colors.primary : colors.surface, borderWidth: 1, borderColor: i18n.language === lng ? colors.primary : colors.border, alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', color: i18n.language === lng ? '#FFF' : colors.text }}>{lng.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Button label={t('Logout')} variant="danger" onPress={logout} icon="logout" />
    </ScrollView>
  );
};