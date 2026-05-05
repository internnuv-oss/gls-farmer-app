import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Platform, Modal, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  maximumDate?: Date; 
  minimumDate?: Date; 
};

export const DatePickerField: React.FC<Props> = ({
  label, value, onChange, placeholder = 'DD-MM-YYYY', error, maximumDate, minimumDate
}) => {
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Safely parse DD-MM-YYYY
  const dateValue = useMemo(() => {
    if (value && value.length === 10) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; 
        const year = parseInt(parts[2], 10);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return maximumDate || new Date(2000, 0, 1); 
  }, [value, maximumDate]);

  // 🚀 Explicitly set 1900 as the minimum date to prevent Android 1970 epoch bugs
  const safeMinimumDate = minimumDate || new Date(1900, 0, 1);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (event.type === 'set' && selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      onChange(`${day}-${month}-${year}`);
    } else if (event.type === 'dismissed') {
      setShow(false);
    }
  };

  const handleTextChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    
    let formatted = cleaned;
    if (cleaned.length >= 3) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    }
    if (cleaned.length >= 5) {
      formatted = `${formatted.slice(0, 5)}-${cleaned.slice(4)}`;
    }
    onChange(formatted);
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', 
          borderWidth: 1.5, borderColor: error ? colors.danger : (isFocused ? colors.primary : colors.border),
          borderRadius: radius.lg, backgroundColor: colors.surface, height: 56, paddingHorizontal: spacing.md,
        }}
      >
        {/* TEXT INPUT for typing */}
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          maxLength={10}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: value ? '600' : '500' }}
        />
        {/* PRESSABLE ICON to open the spinner */}
        <Pressable onPress={() => setShow(true)} style={{ padding: 8, marginLeft: 8 }}>
          <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
        </Pressable>
      </View>
      
      {error ? <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text> : null}

      {show && Platform.OS === 'android' && (
        <DateTimePicker 
          value={dateValue} 
          mode="date" 
          display="spinner" /* 🚀 CHANGED BACK TO SPINNER: You can swipe the Year wheel independently! */
          onChange={handleChange} 
          maximumDate={maximumDate} 
          minimumDate={safeMinimumDate} 
        />
      )}

      {show && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: colors.surface, paddingBottom: 40, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable onPress={() => setShow(false)}>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker 
                value={dateValue} 
                mode="date" 
                display="spinner" 
                onChange={handleChange} 
                maximumDate={maximumDate} 
                minimumDate={safeMinimumDate} 
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};