import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label?: string;
  options: string[];
  value?: string;
  onChange: (val: string) => void;
  error?: string;
};

export const RadioGroup: React.FC<Props> = ({ label, options, value, onChange, error }) => {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label && <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontSize: 12, fontWeight: '700' }}>{label}</Text>}
      <View style={{ gap: spacing.sm }}>
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <Pressable 
              key={opt} 
              onPress={() => onChange(opt)} 
              style={{ 
                flexDirection: 'row', alignItems: 'center', 
                minHeight: 56, // NEW: Increased height
                paddingVertical: spacing.md, // NEW: Increased padding
                paddingHorizontal: spacing.md, 
                borderWidth: 1, borderColor: isSelected ? colors.primary : colors.border, 
                borderRadius: radius.md, backgroundColor: isSelected ? colors.primarySoft : colors.surface 
              }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isSelected ? colors.primary : '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
              </View>
              <Text style={{ fontSize: 15, fontWeight: isSelected ? '700' : '500', color: isSelected ? colors.primary : colors.text }}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text>}
    </View>
  );
};