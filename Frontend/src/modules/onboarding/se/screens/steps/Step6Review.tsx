import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Image, StyleSheet, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../se/schema';
import { useTranslation } from 'react-i18next';

interface Step6Props {
  form: UseFormReturn<SEOnboardingValues>;
  renderEditBtn: (step: number) => React.ReactNode;
}

export const Step6Review = ({ form, renderEditBtn }: Step6Props) => {
  const { watch } = form;
  const values = watch();
  const { t } = useTranslation();
  
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null); // 🚀 Tracks which file is downloading

  // 🚀 SECURE NATIVE PDF OPENER
  const handleViewFile = async (url: string) => {
    if (url.toLowerCase().includes('.pdf') || url.includes('/raw/upload')) {
      setDownloadingDoc(url); // Trigger loading spinner
      try {
        // 1. Download file to hidden local cache
        const fileName = `secure_document_${Date.now()}.pdf`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        const { uri } = await FileSystem.downloadAsync(url, fileUri);
        
        if (Platform.OS === 'android') {
          // 2a. ANDROID: Open with explicit read permissions
          const contentUri = await FileSystem.getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // 🚀 This is the magic flag that grants READ permission!
            type: 'application/pdf'
          });
        } else {
          // 2b. IOS: Open in native QuickLook preview
          await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
        }
      } catch (error) {
        Alert.alert(t("Error"), t("Could not load the document."));
      } finally {
        setDownloadingDoc(null);
      }
    } else {
      setViewerUrl(url); // Standard images still use the Custom App Modal
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
        
        {values.maritalStatus === 'Married' && (
          <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Spouse")}: <Text style={{ color: colors.text }}>{values.spouseName} (+91 {values.spouseMobile})</Text></Text>
        )}

        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Mobile Number")}: <Text style={{ color: colors.text }}>+91 {values.mobileNumber || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Emergency Contact")}: <Text style={{ color: colors.text }}>+91 {values.emergencyContact || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Email ID")}: <Text style={{ color: colors.text }}>{values.emailId || t('N/A')}</Text></Text>

        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Permanent Address")}: <Text style={{ color: colors.text }}>{values.permanentAddress || t('N/A')} - {values.permanentPincode}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Current Address")}: <Text style={{ color: colors.text }}>{values.sameAsPermanent ? t("Same as Permanent") : `${values.currentAddress || t('N/A')} - ${values.currentPincode || ''}`}</Text></Text>
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
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Headquarter")}: <Text style={{ color: colors.text }}>{values.headquarter || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Territory")}: <Text style={{ color: colors.text }}>{values.territory || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Area/Beat")}: <Text style={{ color: colors.text }}>{values.area || t('N/A')}</Text></Text>
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
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("PF/Pension No.")}: <Text style={{ color: colors.text }}>{values.pfPensionNumber || t('N/A')}</Text></Text>
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
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("DL Expiry")}: <Text style={{ color: colors.text }}>{values.dlExpiryDate || t('N/A')}</Text></Text>
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Company Assets")}: <Text style={{ color: colors.text }}>{values.companyAssets?.length ? values.companyAssets.join(', ') : t('None')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Fuel Allowance")}: <Text style={{ color: colors.text }}>{values.fuelAllowance ? `₹${values.fuelAllowance}/km` : t('N/A')}</Text></Text>
      </View>

      {/* 5. Documents */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("5. Documents")}</Text>
           {renderEditBtn(5)}
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