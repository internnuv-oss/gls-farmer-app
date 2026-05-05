import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadows } from '../tokens';

type Props = {
  label: string;
  value: string[];
  options: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  error?: string;
};

export const MultiSelectField: React.FC<Props> = ({
  label, value = [], options, onChange, placeholder = 'Select options', searchable = false, error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter((o) => o.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [options, searchable, searchQuery]);

  const toggleSelect = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <>
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, fontWeight: '700' }]}>{label}</Text>
        <Pressable
          onPress={() => setIsOpen(true)}
          style={{
            flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', 
            borderWidth: 1.5, borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.lg, backgroundColor: colors.surface, 
            minHeight: 56, padding: spacing.sm, paddingHorizontal: spacing.md
          }}
        >
          {value.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 }}>
              {value.map(item => (
                <View key={item} style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill }}>
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ flex: 1, color: '#94A3B8', fontSize: 16, fontWeight: '500' }}>{placeholder}</Text>
          )}
          <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textMuted} style={{ marginLeft: 8 }} />
        </Pressable>
        {/* SAFELY RENDERED */}
        {error ? <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text> : null}
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
                  <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." style={{ flex: 1, fontSize: 15, color: colors.text }} placeholderTextColor={colors.textMuted} />
                </View>
              ) : null}

              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = value.includes(item);
                  return (
                    <Pressable onPress={() => toggleSelect(item)} style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: isSelected ? '800' : '500', color: isSelected ? colors.primary : colors.text }}>{item}</Text>
                      <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected ? <MaterialIcons name="check" size={16} color="#FFF" /> : null}
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>No options found</Text>}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};