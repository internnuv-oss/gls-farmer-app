import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../../../design-system/tokens';
import { Button } from '../../../design-system/components';
import { useExpenseStore } from '../../../store/expenseStore';
import { useShiftStore } from '../../../store/shiftStore';
import { requestCameraPermission } from '../../../core/permissions';
import { useAlertStore } from '../../../store/alertStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { uploadFileToCloudinary } from '../../onboarding/services/cloudinaryService';

export const AddExpenseScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const addExpense = useExpenseStore((state) => state.addExpense);
  const incrementActivity = useShiftStore((state) => state.incrementActivity);

  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date()); // State for the date
  const [showDatePicker, setShowDatePicker] = useState(false); // Toggle visibility
  const [isSaving, setIsSaving] = useState(false);
  
  // Strict Camera-Only States
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [isLaunchingCamera, setIsLaunchingCamera] = useState(false);

  const handleCameraCapture = async () => {
    try {
      // 1. Request permission BEFORE setting the loading state.
      // This prevents the UI from freezing if the Android permission dialog hangs.
      const perm = await requestCameraPermission();
      if (!perm.granted) {
        useAlertStore.getState().showAlert(t("Permission Denied"), perm.fallbackMessage);
        return;
      }

      // 2. Now that we have permission, show the loader while the camera boots up
      setIsLaunchingCamera(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], 
        quality: 0.6,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      useAlertStore.getState().showAlert(t("Error"), t("Failed to open camera."));
    } finally {
      setIsLaunchingCamera(false); 
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const receiptUrl = receiptImage ? await uploadFileToCloudinary(receiptImage, 'image') : '';
      await addExpense({ category, amount, remarks: remarks.trim(), date: expenseDate.toISOString(), receipt_url: receiptUrl });
      
      useAlertStore.getState().showAlert(t("Success"), t("Expense logged successfully."));
      navigation.goBack();
    } catch (error) {
      useAlertStore.getState().showAlert(t("Error"), t("Failed to save expense."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{t("Log Expense")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            {t("Amount (₹)")} <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TextInput 
            value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 24, fontWeight: '900', color: colors.text }}
          />
        </View>

        <View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            {t("Date of Expense")} <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <Pressable 
            onPress={() => setShowDatePicker(true)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }}
          >
            <MaterialIcons name="calendar-today" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {expenseDate.toLocaleDateString()}
            </Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            display="default"
            maximumDate={new Date()} // Prevent future-dated expenses
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setExpenseDate(date);
            }}
          />
        )}

        <View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            {t("Category")} <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['Food', 'Travelling', 'Misc'].map(cat => (
              <View key={cat} style={{ flex: 1 }}>
                <Button label={t(cat)} variant={category === cat ? 'primary' : 'secondary'} onPress={() => setCategory(cat)} />
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            {t("Remarks")} <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TextInput 
            value={remarks} onChangeText={setRemarks} multiline numberOfLines={3} placeholder={t("Brief description...")}
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 14, fontWeight: '500', color: colors.text, textAlignVertical: 'top' }}
          />
        </View>

        <View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
            {t("Bill/Receipt (Optional)")}
          </Text>
          
          {/* CAMERA ONLY CAPTURE TILE */}
          {receiptImage ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md }}>
              <MaterialIcons name="check-circle" size={24} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14, flex: 1, marginLeft: 8 }}>{t("Bill/Receipt Captured")}</Text>
              <Pressable onPress={() => setReceiptImage(undefined)} style={{ padding: 4 }}>
                <MaterialIcons name="delete" size={22} color={colors.danger} />
              </Pressable>
            </View>
          ) : isLaunchingCamera ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ marginLeft: 8, color: colors.text, fontWeight: '700' }}>{t("Opening Camera...")}</Text>
            </View>
          ) : (
            <Pressable 
              onPress={handleCameraCapture} 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}
            >
              <MaterialIcons name="photo-camera" size={22} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>{t("Open Camera")}</Text>
            </Pressable>
          )}
        </View>

      </ScrollView>

      <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button 
          label={isSaving ? t("Submitting...") : t("Submit Expense")} 
          onPress={handleSave} 
          disabled={!amount || remarks.trim() === '' || isSaving} 
        />
      </View>
    </View>
  );
};