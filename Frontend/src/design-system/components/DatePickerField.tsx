import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  maximumDate?: Date; // <-- NEW
  minimumDate?: Date; // <-- NEW
};

export const DatePickerField: React.FC<Props> = ({
  label, value, onChange, placeholder = 'YYYY-MM-DD', error, maximumDate, minimumDate
}) => {
  const [show, setShow] = useState(false);
  const dateValue = value ? new Date(value) : (maximumDate || new Date()); // Default to maxDate if provided so the spinner starts at a valid year

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (event.type === 'set' && selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      // 🚀 Format changed to dd-mm-yyyy
      onChange(`${day}-${month}-${year}`);
    } else if (event.type === 'dismissed') {
      setShow(false);
    }
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: error ? colors.danger : colors.border,
          borderRadius: radius.lg, backgroundColor: colors.surface, height: 56, paddingHorizontal: spacing.md,
        }}
      >
        <MaterialIcons name="calendar-today" size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <Text style={{ flex: 1, color: value ? colors.text : '#94A3B8', fontSize: 16, fontWeight: value ? '600' : '500' }}>
          {value || placeholder}
        </Text>
      </Pressable>
      {error ? <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error}</Text> : null}

      {show && Platform.OS === 'android' && (
        <DateTimePicker value={dateValue} mode="date" display="spinner" onChange={handleChange} maximumDate={maximumDate} minimumDate={minimumDate} />
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
              <DateTimePicker value={dateValue} mode="date" display="spinner" onChange={handleChange} maximumDate={maximumDate} minimumDate={minimumDate} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};