import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { DatePickerField } from '../../../design-system/components/DatePickerField';
import { TextArea } from '../../../design-system/components/TextArea';
import { Button } from '../../../design-system/components/Button';
import { supabase } from '../../../core/supabase';
import { useAlertStore } from '../../../store/alertStore';
import { useShiftStore } from '../../../store/shiftStore';
import { useAuthStore } from '../../../store/authStore';

export const GeneralVisitScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { entity } = route.params;
  const { showAlert } = useAlertStore();
  const isActive = useShiftStore((s) => s.isActive);

  const getTodayString = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [date, setDate] = useState<string>(getTodayString());
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false); // prevents race-condition double submissions

  // Normalize to always be DD-MM-YYYY with zero-padded parts
  const normalizeDateStr = (d: string): string => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    const day   = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year  = parts[2];
    return `${day}-${month}-${year}`;
  };

  const handleSubmit = async () => {
    // Block if a submission is already in-flight (race condition guard)
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (!isActive) {
      submittingRef.current = false;
      showAlert(t("Not Allowed"), t("You can only log a General Visit while you are punched in."));
      return;
    }
    if (!comment.trim()) {
      submittingRef.current = false;
      showAlert(t("Error"), t("Comment is compulsory for a General Visit."));
      return;
    }
    if (!date) {
      submittingRef.current = false;
      showAlert(t("Error"), t("Please select a date."));
      return;
    }

    setLoading(true);
    try {
      const tableName = entity.isDraft ? 'drafts' : 'farmers';
      const entityId = entity.entityId || entity.id;
      const idColumn = entity.isDraft ? 'entity_id' : 'id';

      // 1. Fetch current comments
      const { data: currentData, error: fetchError } = await supabase
        .from(tableName)
        .select('comments')
        .eq(idColumn, entityId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const currentComments = currentData?.comments || [];
      const normalizedDate = normalizeDateStr(date);
      
      const isDuplicateDate = currentComments.some(
        (c: any) => normalizeDateStr(c.date) === normalizedDate
      );
      if (isDuplicateDate) {
        setLoading(false);
        submittingRef.current = false;
        showAlert(t("Visit Already Exists for this Date"), t("A visit log already exists for this date. Only one comment per date is allowed."));
        return;
      }

      // Verify a shift exists for the selected date
      const [selDay, selMonth, selYear] = normalizedDate.split('-');
      const isoDate = `${selYear}-${selMonth}-${selDay}`;
      const userId = useAuthStore.getState().user?.id;
      const { data: shiftForDate } = await supabase
        .from('shifts')
        .select('id, assigned_route_id')
        .eq('se_id', userId)
        .eq('date', isoDate)
        .maybeSingle();

      if (!shiftForDate) {
        setLoading(false);
        submittingRef.current = false;
        showAlert(
          t("No Shift Found"),
          t("You cannot log a General Visit for a date on which you were not punched in.")
        );
        return;
      }

      const newCommentObj = {
        date: normalizedDate,
        comment: comment.trim(),
        created_at: new Date().toISOString()
      };

      // 2. Append and Update
      const newComments = [...currentComments, newCommentObj];

      const { error: updateError } = await supabase
        .from(tableName)
        .update({ comments: newComments })
        .eq(idColumn, entityId);

      if (updateError) throw updateError;

      let routeName = "Others";
      if (shiftForDate?.assigned_route_id) {
        const { data: rData } = await supabase.from('routes').select('name').eq('id', shiftForDate.assigned_route_id).single();
        if (rData?.name) routeName = rData.name;
      }
      
      const raw = entity.raw || entity;
      const villageName = raw.personal_details?.village || raw.village || raw.city || "Unknown Village";
      const eventDesc = `${entity.name}\n${routeName} (${villageName})`;

      // Use logActivityForDate — works whether shift is active OR already punched out
      // logShiftEvent silently does nothing when activeShiftId is null (after punch-out)
      await useShiftStore.getState().logActivityForDate(date, 'General Visit', eventDesc);

      showAlert(
        t("Success"),
        t("General Visit logged successfully."),
        [
          {
            text: t("OK"),
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (e: any) {
      console.error(e);
      showAlert(t("Error"), t("Failed to log visit: ") + e.message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* Header section */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: spacing.xs }}>
          {t("General Visit")}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>
          {entity.name}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl }}>
        <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
          
          <View style={{ marginBottom: spacing.xl }}>
            <DatePickerField
              label={t("Visit Date")}
              value={date}
              onChange={setDate}
              placeholder={t("Select Date")}
              maximumDate={new Date()}
            />
          </View>

          <View style={{ marginBottom: spacing.xl }}>
            <TextArea
              label={t("Comments") + " *"}
              value={comment}
              onChangeText={setComment}
              placeholder={t("Enter your visit notes here...")}
            />
          </View>

          <Button
            label={t("Submit Visit")}
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
