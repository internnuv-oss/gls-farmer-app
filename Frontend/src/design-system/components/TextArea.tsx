import React, { useState } from 'react';
import { TextInput, Text, View } from 'react-native';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  minHeight?: number;
};

export const TextArea: React.FC<Props> = ({ label, placeholder, value, onChangeText, error, minHeight = 100 }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: spacing.lg, width: '100%' }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <View style={{ borderWidth: 1.5, borderColor: error ? colors.danger : isFocused ? colors.primary : colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, shadowColor: isFocused ? colors.primary : '#000', shadowOpacity: isFocused ? 0.1 : 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: isFocused ? 2 : 0 }}>
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8"
          multiline textAlignVertical="top" onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          style={{ minHeight, color: colors.text, fontSize: 16, fontWeight: '500', padding: 0 }}
        />
      </View>
      {error && <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text>}
    </View>
  );
};