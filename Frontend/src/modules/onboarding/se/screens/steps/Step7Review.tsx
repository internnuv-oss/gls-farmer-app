import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../se/schema';
import { useTranslation } from 'react-i18next';
import { useAlertStore } from '../../../../../store/alertStore';

interface Step7Props {
  form: UseFormReturn<SEOnboardingValues>;
  renderEditBtn: (step: number) => React.ReactNode;
}

export const Step7Review = ({ form, renderEditBtn }: Step7Props) => {
  const { watch } = form;
  const values = watch();
  const { t } = useTranslation();
  
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const handleViewFile = async (url: string) => {
    if (url.toLowerCase().includes('.pdf') || url.includes('/raw/upload')) {
      setDownloadingDoc(url);
      try {
        const fileName = `secure_document_${Date.now()}.pdf`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        const { uri } = await FileSystem.downloadAsync(url, fileUri);
        
        if (Platform.OS === 'android') {
          const contentUri = await FileSystem.getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: 'application/pdf' });
        } else {
          await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
        }
      } catch (error) {
        useAlertStore.getState().showAlert(t("Error"), t("Could not load the document."));
      } finally {
        setDownloadingDoc(null);
      }
    } else {
      setViewerUrl(url); 
    }
  };

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Final Review")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>
        {t("Please verify all the details carefully before submitting your profile.")}
      </Text>

      {/* 1. Personal Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("1. Personal Details")}</Text>
           {renderEditBtn(1)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Full Name")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{values.firstName} {values.lastName}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Date of Birth")}: <Text style={{ color: colors.text }}>{values.dob || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Blood Group")}: <Text style={{ color: colors.text }}>{values.bloodGroup || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Marital Status")}: <Text style={{ color: colors.text }}>{values.maritalStatus || t('N/A')}</Text></Text>
        {values.maritalStatus === 'Married' && <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Spouse")}: <Text style={{ color: colors.text }}>{values.spouseName} (+91 {values.spouseMobile})</Text></Text>}
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Mobile Number")}: <Text style={{ color: colors.text }}>+91 {values.mobileNumber || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Emergency Contact")}: <Text style={{ color: colors.text }}>+91 {values.emergencyContact || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Email ID")}: <Text style={{ color: colors.text }}>{values.emailId || t('N/A')}</Text></Text>
      </View>

      {/* 2. Work Assignment */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("2. Work Assignment")}</Text>
           {renderEditBtn(2)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Employee ID")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{values.employeeId || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Designation")}: <Text style={{ color: colors.text }}>{values.designation || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Reporting To")}: <Text style={{ color: colors.text }}>{values.reportingTo || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Joining Date")}: <Text style={{ color: colors.text }}>{values.joiningDate || t('N/A')}</Text></Text>
      </View>

      {/* 3. Statutory & Financial */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("3. Statutory & Financial")}</Text>
           {renderEditBtn(3)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("PAN Number")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{values.panNumber || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Bank Name")}: <Text style={{ color: colors.text }}>{values.bankName || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Account Number")}: <Text style={{ color: colors.text }}>{values.bankAccountNumber || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("IFSC Code")}: <Text style={{ color: colors.text }}>{values.bankIfsc || t('N/A')}</Text></Text>
      </View>

      {/* 4. Assets & Logistics */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("4. Assets & Logistics")}</Text>
           {renderEditBtn(4)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Vehicle Type")}: <Text style={{ color: colors.text }}>{values.vehicleType || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Vehicle Number")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{values.vehicleNumber || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Driving License No")}: <Text style={{ color: colors.text }}>{values.drivingLicenseNo || t('N/A')}</Text></Text>
      </View>

      {/* 🚀 5. NEW: Insurances */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("5. Insurance Details")}</Text>
           {renderEditBtn(5)}
        </View>

        {watch('insurances')?.length ? watch('insurances')?.map((ins: any, i: number) => (
          <View key={i} style={{ marginBottom: spacing.md, backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: 4 }}>{t("Policy")} {i + 1}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 2 }}>{t("Type")}: <Text style={{ color: colors.text }}>{ins.type || t("None")}</Text></Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 2 }}>{t("Provider")}: <Text style={{ color: colors.text }}>{ins.provider || t("None")}</Text></Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 2 }}>{t("Policy Number")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{ins.insuranceId || t("None")}</Text></Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t("Document")}: </Text>
                {ins.documentUrl ? (
                  <Pressable onPress={() => handleViewFile(ins.documentUrl)} style={{ flexDirection: 'row', alignItems: 'center' }} disabled={downloadingDoc === ins.documentUrl}>
                    {downloadingDoc === ins.documentUrl ? <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} /> : null}
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' }}>{t("View Uploaded File")}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>{t("Not Uploaded")}</Text>
                )}
            </View>
          </View>
        )) : <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>{t("No insurances recorded.")}</Text>}
      </View>

      {/* 🚀 6. Documents (Shifted to 6) */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("6. Documents")}</Text>
           {renderEditBtn(6)}
        </View>
        
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>{t("Files Uploaded")}:</Text>

        {[
          { key: 'profilePhoto', label: 'Profile Photo', url: values.documents?.profilePhoto },
          { key: 'aadharCard', label: 'Aadhar Card', url: values.documents?.aadharCard },
          { key: 'panCard', label: 'PAN Card', url: values.documents?.panCard },
          { key: 'addressProof', label: 'Address Proof', url: values.documents?.addressProof },
          { key: 'relievingLetter', label: 'Relieving Letter', url: values.documents?.relievingLetter }
        ].map(doc => (
          <View key={doc.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>• {t(doc.label)}:</Text>
            {doc.url ? (
              <Pressable onPress={() => handleViewFile(doc.url!)} style={{ flexDirection: 'row', alignItems: 'center' }} disabled={downloadingDoc === doc.url}>
                 {downloadingDoc === doc.url ? (
                   <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
                 ) : (
                   <MaterialIcons name="visibility" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                 )}
                 <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                   {downloadingDoc === doc.url ? t("Opening...") : t("View File")}
                 </Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>{t("Missing")}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Image Viewer Modal */}
      <Modal visible={!!viewerUrl} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.closeBtn} onPress={() => setViewerUrl(null)}>
            <MaterialIcons name="close" size={32} color="#FFF" />
          </Pressable>
          {viewerUrl && <Image source={{ uri: viewerUrl }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullImage: { width: '95%', height: '80%' }
});