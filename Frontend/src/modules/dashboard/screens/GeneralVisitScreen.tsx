import React, { useState } from 'react';
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

export const GeneralVisitScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { entity } = route.params;
  const { showAlert } = useAlertStore();

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

  const handleSubmit = async () => {
    if (!comment.trim()) {
      showAlert(t("Error"), t("Comment is compulsory for a General Visit."));
      return;
    }
    if (!date) {
      showAlert(t("Error"), t("Please select a date."));
      return;
    }

    setLoading(true);
    try {
      const tableName = entity.isDraft ? 'drafts' : 'farmers';
      const entityId = entity.entityId || entity.id;

      // 1. Fetch current comments
      const { data: currentData, error: fetchError } = await supabase
        .from(tableName)
        .select('comments')
        .eq('id', entityId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const currentComments = currentData?.comments || [];
      
      const isDuplicateDate = currentComments.some((c: any) => c.date === date);
      if (isDuplicateDate) {
        setLoading(false);
        showAlert(t("Error"), t("A visit log already exists for this date. Only one comment per date is allowed."));
        return;
      }

      const newCommentObj = {
        date: date,
        comment: comment.trim(),
        created_at: new Date().toISOString()
      };

      // 2. Append and Update
      const newComments = [...currentComments, newCommentObj];

      const { error: updateError } = await supabase
        .from(tableName)
        .update({ comments: newComments })
        .eq('id', entityId);

      if (updateError) throw updateError;

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
