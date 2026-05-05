import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const CheckboxItem: React.FC<Props> = ({ label, checked, onChange }) => {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 24, height: 24, borderRadius: 6, borderWidth: 2,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : 'transparent',
          alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
        }}
      >
        {/* SAFELY RENDERED */}
        {checked ? <MaterialIcons name="check" size={16} color="#FFF" /> : null}
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
};