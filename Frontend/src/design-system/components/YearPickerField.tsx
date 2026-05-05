import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../tokens';

type Props = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
};

export const YearPickerField: React.FC<Props> = ({ label, value, onChange, placeholder = 'Select Year', error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());

  return (
    <>
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>{label}</Text>
        <Pressable onPress={() => setIsOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: error ? colors.danger : colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, height: 56, paddingHorizontal: spacing.md }}>
          <MaterialIcons name="calendar-today" size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
          <Text style={{ flex: 1, color: value ? colors.text : '#94A3B8', fontSize: 16, fontWeight: value ? '600' : '500' }}>{value || placeholder}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textMuted} />
        </Pressable>
        
        {/* SAFELY rendered with ternary operator */}
        {error ? <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text> : null}
      </View>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)} />
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '50%', padding: spacing.lg, paddingBottom: spacing['2xl'], ...shadows.soft }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{label}</Text>
              <Pressable onPress={() => setIsOpen(false)}><MaterialIcons name="close" size={24} color={colors.textMuted} /></Pressable>
            </View>
            <FlatList data={years} keyExtractor={(item) => item} showsVerticalScrollIndicator={false} renderItem={({ item }) => (
              <Pressable onPress={() => { onChange(item); setIsOpen(false); }} style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: item === value ? '800' : '500', color: item === value ? colors.primary : colors.text }}>{item}</Text>
                {item === value ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
              </Pressable>
            )} />
          </View>
        </View>
      </Modal>
    </>
  );
};