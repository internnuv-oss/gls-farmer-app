import React from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, spacing } from '../tokens';

type Props = { label: string; value: number; onChange: (val: number) => void; };

export const ScoreSlider: React.FC<Props> = ({ label, value, onChange }) => {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>{label}</Text>
        <Text style={{ fontWeight: '800', color: colors.primary }}>{value}/10</Text>
      </View>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={1} maximumValue={10} step={1}
        value={value} onValueChange={onChange}
        minimumTrackTintColor={colors.primary} maximumTrackTintColor={colors.border} thumbTintColor={colors.primary}
      />
    </View>
  );
};