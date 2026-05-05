import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadows } from '../tokens';

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  searchable?: boolean;
  error?: string;
  iconName?: React.ComponentProps<typeof MaterialIcons>['name'];
};

export const SelectField: React.FC<Props> = ({
  label, value, options, onChange, placeholder = 'Select an option', searchable = false, error, iconName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter((o) => o.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [options, searchable, searchQuery]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

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
          {iconName ? <MaterialIcons name={iconName} size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} /> : null}
          <Text style={{ flex: 1, color: value ? colors.text : '#94A3B8', fontSize: 16, fontWeight: value ? '600' : '500' }}>
            {value || placeholder}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textMuted} />
        </Pressable>
        {error ? <Text style={{ color: colors.danger, marginTop: spacing.xs, fontSize: 12 }}>{error}</Text> : null}
      </View>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)} />
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '80%', padding: spacing.lg, paddingBottom: spacing['2xl'], ...shadows.soft }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{label}</Text>
                <Pressable onPress={() => setIsOpen(false)}><MaterialIcons name="close" size={24} color={colors.textMuted} /></Pressable>
              </View>
              
              {searchable ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, marginBottom: spacing.md }}>
                  <MaterialIcons name="search" size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                  <TextInput autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." style={{ flex: 1, fontSize: 15, color: colors.text }} placeholderTextColor={colors.textMuted} />
                </View>
              ) : null}

              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable onPress={() => handleSelect(item)} style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: item === value ? '800' : '500', color: item === value ? colors.primary : colors.text }}>{item}</Text>
                    {item === value ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>No options found</Text>}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};