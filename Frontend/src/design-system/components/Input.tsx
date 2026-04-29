import React, { useState } from 'react';
import { TextInput, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  isPassword?: boolean;
  prefix?: string;
  suffix?: string; // 🚀 NEW PROP
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; // 🚀 NEW PROP
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  maxLength?: number;
};

export const Input: React.FC<Props> = ({
  label, placeholder, value, onChangeText, error, keyboardType, isPassword, prefix, suffix, autoCapitalize = 'sentences', icon, maxLength
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: spacing.lg, width: '100%' }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          borderWidth: 1.5, borderColor: error ? colors.danger : isFocused ? colors.primary : colors.border,
          borderRadius: radius.lg, backgroundColor: colors.surface, height: 56,
          paddingHorizontal: spacing.md,
          shadowColor: isFocused ? colors.primary : '#000', shadowOpacity: isFocused ? 0.1 : 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: isFocused ? 2 : 0
        }}
      >
        {icon && <MaterialIcons name={icon} size={20} color={isFocused ? colors.primary : colors.textMuted} style={{ marginRight: spacing.sm }} />}
        
        {prefix && (
          <View style={{ borderRightWidth: 1, borderRightColor: colors.border, paddingRight: spacing.sm, marginRight: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{prefix}</Text>
          </View>
        )}
        
        <TextInput
          value={value} 
          onChangeText={onChangeText} 
          placeholder={placeholder} 
          keyboardType={keyboardType}
          placeholderTextColor="#94A3B8" 
          secureTextEntry={isPassword && !showPassword} 
          maxLength={maxLength}
          autoCapitalize={autoCapitalize} // 🚀 APPLIED HERE
          onFocus={() => setIsFocused(true)} 
          onBlur={() => setIsFocused(false)}
          style={{ flex: 1, height: '100%', color: colors.text, fontSize: 16, fontWeight: '600' }}
        />
        
        {/* 🚀 NEW SUFFIX RENDERING */}
        {suffix && (
          <View style={{ borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.sm, marginLeft: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 16 }}>{suffix}</Text>
          </View>
        )}

        {isPassword && (
          <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: spacing.xs }}>
            <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error && <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text>}
    </View>
  );
};