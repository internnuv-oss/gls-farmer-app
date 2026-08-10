import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import type { DiaryStageRow } from '../services/villageFarmDiaryService';

type Props = {
  farmer: any;
  diaries: DiaryStageRow[];
  navigation: any;
  t: any;
};

export const FarmDiaryEntityCard = React.memo(({ farmer, diaries, navigation, t }: Props) => {
  const phone = farmer.raw?.mobile || farmer.raw?.contactMobile;
  const land = farmer.raw?.farm_details?.totalLand || farmer.raw?.totalLand;
  const landUnit = farmer.raw?.farm_details?.landUnit || farmer.raw?.landUnit || 'Acres';
  const rawCrops = farmer.raw?.farm_details?.majorCrops || farmer.raw?.majorCrops;
  const crops = Array.isArray(rawCrops) ? rawCrops.join(', ') : rawCrops;
  const rawWater = farmer.raw?.farm_details?.waterSource || farmer.raw?.waterSource;
  const water = Array.isArray(rawWater) ? rawWater.join(', ') : rawWater;

  const infoBlocks: { icon: string; value: any; isPhone: boolean; translate?: boolean }[] = [
    { icon: 'phone', value: phone, isPhone: true },
    { icon: 'landscape', value: land ? `${land} ${t(landUnit)}` : null, isPhone: false },
    { icon: 'grass', value: crops, isPhone: false, translate: true },
    { icon: 'water-drop', value: water, isPhone: false, translate: true },
  ].filter((b) => b.value && String(b.value).trim() !== '');

  return (
    <Pressable
      onPress={() => navigation.navigate('FarmDiaryHubScreen', { farmer })}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.soft,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: 6, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#8B5CF6' }} />

      <View style={{ padding: spacing.lg, paddingLeft: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{farmer.name}</Text>
            {(farmer.city || farmer.state) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>
                  {[farmer.city, farmer.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            ) : null}
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
        </View>

        <View
          style={{
            marginTop: spacing.md,
            backgroundColor: '#F8FAFC',
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {infoBlocks.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic', fontWeight: '600' }}>
              {t('Profile details are incomplete')}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs, rowGap: spacing.sm }}>
              {infoBlocks.map((block, idx) => (
                <View
                  key={idx}
                  style={{ width: '50%', paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center' }}
                >
                  <MaterialIcons name={block.icon as any} size={16} color={colors.primary} />
                  {block.isPhone ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${block.value}`)} style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.primary,
                          marginLeft: 6,
                          fontWeight: '700',
                          textDecorationLine: 'underline',
                        }}
                        numberOfLines={1}
                      >
                        +91 {block.value}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text
                      style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600', flex: 1 }}
                      numberOfLines={1}
                    >
                      {block.translate ? t(block.value as string) : block.value}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text
            style={{
              fontSize: 10,
              color: colors.textMuted,
              fontWeight: '800',
              letterSpacing: 0.5,
              marginBottom: spacing.sm,
            }}
          >
            {t('FARM DIARIES')}
          </Text>

          {diaries.map((diary, index) => (
            <View
              key={diary.diaryId}
              style={{
                backgroundColor: '#F5F3FF',
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: index < diaries.length - 1 ? spacing.sm : 0,
                borderWidth: 1,
                borderColor: '#DDD6FE',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 }} numberOfLines={1}>
                {diary.farmName === 'No diary yet' ? t('No diary yet') : diary.farmName}
              </Text>

              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, marginBottom: 2 }}>
                    {t('Current Stage')}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6D28D9' }} numberOfLines={1}>
                    {t(diary.currentStage)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, marginBottom: 2 }}>
                    {t('Next Stage')}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {t(diary.nextStage)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
});
