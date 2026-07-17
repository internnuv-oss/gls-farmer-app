import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useFarmDiaryStore } from '../../../store/farmDiaryStore';
import { useTranslation } from 'react-i18next';

export const HistoryLedgerList = ({ diaryId, onVisitPress }: { diaryId: string, onVisitPress?: (visit: any, visitNumber: number) => void }) => {
  const { t } = useTranslation();
  const { fetchHistoryLedger } = useFarmDiaryStore();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, [diaryId]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await fetchHistoryLedger(diaryId);
    
    // Sort chronologically (oldest first) so Visit 1, 2, 3 makes sense
    const sortedData = [...data].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    setHistory(sortedData);
    setLoading(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
  }

  if (history.length === 0) {
    return (
      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <MaterialIcons name="history" size={64} color={colors.textMuted} />
        <Text style={{ marginTop: 16, fontSize: 16, color: colors.textMuted }}>
          {t("No history found for this diary.")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 100 }}>
      {history.map((session, index) => {
        const visitNumber = index + 1;
        const stageName = session.is_general 
          ? t('General') 
          : (session.master_crop_stages?.stage_name || t('Unknown Stage'));
        
        const title = `${t("Visit")} ${visitNumber}: ${stageName}`;

        return (
          <Pressable 
            key={session.id} 
            style={styles.card}
            onPress={() => onVisitPress && onVisitPress(session, visitNumber)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <MaterialIcons name="eco" size={20} color={colors.success} style={{ marginRight: spacing.xs }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 }}>
                {title}
              </Text>
              {!session.is_general && (
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#166534' }}>
                    {t("Health")}: {session.overall_plant_health_score}/10
                  </Text>
                </View>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>
                  {new Date(session.created_at).toLocaleDateString()}
                </Text>
                {!session.is_general && (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {session.master_crops?.crop_name}
                  </Text>
                )}
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.soft
  }
});
