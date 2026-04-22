import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadows } from '../tokens';

type Props = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
};

export const YearPickerField: React.FC<Props> = ({
  label, value, onChange, placeholder = 'Select Year', error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate years from 1950 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => (currentYear - i).toString());

  return (
    <>
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>{label}</Text>
        <Pressable
          onPress={() => setIsOpen(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.lg, backgroundColor: colors.surface, height: 56, paddingHorizontal: spacing.lg,
          }}
        >
          <MaterialIcons name="calendar-today" size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
          <Text style={{ flex: 1, color: value ? colors.text : '#94A3B8', fontSize: 16, fontWeight: value ? '600' : '400' }}>
            {value || placeholder}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textMuted} />
        </Pressable>
        {error ? <Text style={{ color: colors.danger, marginTop: spacing.xs, fontSize: 12 }}>{error}</Text> : null}
      </View>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, width: '100%', maxHeight: '70%', padding: spacing.lg, ...shadows.soft }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Select Year</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            <FlatList
              data={years}
              keyExtractor={(item) => item}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              renderItem={({ item }) => (
                <Pressable 
                  onPress={() => { onChange(item); setIsOpen(false); }} 
                  style={{ 
                    width: '30%', paddingVertical: spacing.md, marginBottom: spacing.md, 
                    backgroundColor: item === value ? colors.primary : '#F8FAFC', 
                    borderRadius: radius.md, alignItems: 'center',
                    borderWidth: 1, borderColor: item === value ? colors.primary : colors.border
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: item === value ? '800' : '600', color: item === value ? '#FFF' : colors.text }}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};