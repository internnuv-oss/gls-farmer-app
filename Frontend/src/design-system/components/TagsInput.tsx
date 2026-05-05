import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label: string;
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  error?: string;
};

export const TagsInput: React.FC<Props> = ({ label, value = [], onChange, placeholder, error }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleAdd = () => {
    if (text.trim() && !value.includes(text.trim())) {
      onChange([...value, text.trim()]);
    }
    setText('');
  };

  return (
    <View style={{ marginBottom: spacing.lg, width: '100%' }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: value.length > 0 ? 8 : 0 }}>
        {value.map((tag, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginRight: 4 }}>{tag}</Text>
            <Pressable onPress={() => onChange(value.filter((_, i) => i !== index))} hitSlop={10}>
              <MaterialIcons name="close" size={16} color={colors.primary} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: error ? colors.danger : isFocused ? colors.primary : colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, height: 56, paddingHorizontal: spacing.md }}>
        <TextInput
          value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor="#94A3B8"
          onSubmitEditing={handleAdd} blurOnSubmit={false} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          style={{ flex: 1, height: '100%', color: colors.text, fontSize: 16, fontWeight: '600' }}
        />
        <Pressable onPress={handleAdd} style={{ padding: 8, backgroundColor: text ? colors.primary : '#E2E8F0', borderRadius: radius.md }}>
          <MaterialIcons name="add" size={20} color={text ? '#FFF' : '#94A3B8'} />
        </Pressable>
      </View>
      
      {/* SAFELY rendered with ternary operator */}
      {error ? <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text> : null}
    </View>
  );
};