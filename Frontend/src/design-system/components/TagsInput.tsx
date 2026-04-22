import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label?: string;
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  error?: string;
};

export const TagsInput: React.FC<Props> = ({ label, value = [], onChange, placeholder = "Type and press Enter", error }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue(''); // clear input after adding
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  // Using 'any' here avoids the deprecated TextInputKeyPressEventData warning 
  // while still allowing us to safely check for the Backspace key.
  const onKeyPress = (e: any) => {
    // If user presses backspace and input is empty, delete the last tag
    if (e.nativeEvent.key === 'Backspace' && inputValue === '' && value.length > 0) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 8, fontSize: 14 }}>{label}</Text>}
      
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        backgroundColor: colors.surface,
        borderWidth: 1.5, 
        borderColor: error ? colors.danger : colors.border, 
        borderRadius: radius.md, 
        padding: 8,
        minHeight: 50
      }}>
        
        {/* Render existing tags */}
        {value.map((tag) => (
          <View key={tag} style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: colors.primarySoft, 
            paddingVertical: 6, 
            paddingHorizontal: 10, 
            borderRadius: radius.pill, 
            marginRight: 6, 
            marginBottom: 6 
          }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginRight: 4 }}>{tag}</Text>
            <Pressable onPress={() => handleRemoveTag(tag)}>
              <MaterialIcons name="close" size={16} color={colors.primary} />
            </Pressable>
          </View>
        ))}

        {/* Input for new tag */}
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAddTag} // Adds tag when user presses "Enter" on keyboard
          onBlur={handleAddTag} // Adds tag if user clicks away
          onKeyPress={onKeyPress}
          placeholder={value.length === 0 ? placeholder : "Add more..."}
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, minWidth: 100, fontSize: 15, color: colors.text, paddingVertical: 4, paddingHorizontal: 4 }}
          
          // NEW: Replaces blurOnSubmit={false} to keep keyboard open on Enter
          submitBehavior="submit" 
        />
      </View>
      {error && <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text>}
    </View>
  );
};