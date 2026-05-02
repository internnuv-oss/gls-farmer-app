import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Image, Modal, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';


import { useAuthStore } from '../../../store/authStore';
import { useDraftStore } from '../../../store/draftStore';
import { Button } from '../../../design-system/components/Button';
import { fetchNetworkSummary, fetchSEProfile } from '../services/dashboardService';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';

export const ProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const seDraft = useDraftStore((state) => state.seDraft);
  const navigation = useNavigation<any>();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ dealers: 0, farmers: 0, distributors: 0 });
  const [seData, setSeData] = useState<any>(null);
  
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null); // 🚀 Tracks which file is downloading

  const loadAllData = async () => {
    if (!user?.id) return;
    try {
      const [summary, profile] = await Promise.all([
        fetchNetworkSummary(user.id),
        fetchSEProfile(user.id)
      ]);
      setCounts(summary);
      setSeData(profile);
    } catch (error) {
      console.error("Failed to load profile data", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const changeLanguage = (lng: string) => { i18n.changeLanguage(lng); };

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.screen }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isProfileComplete = user?.isProfileComplete || seData?.is_profile_complete;

  // 🚀 RECOMBINE THE SPLIT COLUMNS SO THE UI KEEPS WORKING FLAWLESSLY
  const values = seData ? {
    ...seData.personal_details, //firstName, lastName, dob, and contact info are all here now
    ...seData.organization_details,
    ...seData.financial_details,
    ...seData.assets_details,
    documents: seData.documents || {}
  } : {};

  const profilePhotoUrl = values?.documents?.profilePhoto;


// ... rest of the file remains exactly the same
  const DataRow = ({ label, value, prefix }: { label: string, value?: any, prefix?: string }) => {
    const hasValue = value && (Array.isArray(value) ? value.length > 0 : true);
    let displayValue = hasValue ? (Array.isArray(value) ? value.join(', ') : value) : "N/A";
    if (hasValue && prefix) displayValue = `${prefix} ${displayValue}`;
      
    return (
      <View style={styles.dataRow}>
        <Text style={styles.label}>{t(label)}</Text>
        <Text style={styles.value}>{displayValue}</Text>
      </View>
    );
  };

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

  const DocRow = ({ label, url }: { label: string, url?: string }) => (
    <View style={styles.docRow}>
      <Text style={styles.docLabel}>{t(label)}</Text>
      {url ? (
        <Pressable onPress={() => handleViewFile(url)} style={styles.viewBtn} disabled={downloadingDoc === url}>
          {downloadingDoc === url ? (
            <ActivityIndicator size="small" color="#166534" style={{ marginRight: 4 }} />
          ) : (
            <MaterialIcons name="visibility" size={16} color={colors.primary} />
          )}
          <Text style={styles.viewText}>{downloadingDoc === url ? t("Opening...") : t("View File")}</Text>
        </Pressable>
      ) : (
        <View style={styles.missingBadge}>
          <Text style={styles.missingText}>{t("Missing")}</Text>
        </View>
      )}
    </View>
  );

  const StatBox = ({ title, count, icon, color }: any) => (
    <View style={styles.statBox}>
      <MaterialIcons name={icon} size={28} color={color} style={{ marginBottom: 8 }} />
      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{count}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: 60, backgroundColor: colors.screen }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <Text style={{ fontSize: 24, fontWeight: '900' }}>{t('My Profile')}</Text>
        {isProfileComplete && (
          <Pressable 
          onPress={() => navigation.navigate('SEOnboardingScreen', { editData: values })}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}
          >
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '800', marginLeft: 4 }}>{t("Edit")}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <MaterialIcons name="person" size={50} color={colors.primary} />
          )}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900' }}>
          {seData?.first_name 
            ? `${seData.first_name} ${seData.last_name || ''}` 
            : (user?.name || t("Sales Executive"))}
        </Text>
        <Text style={{ color: colors.textMuted, fontWeight: '700', marginTop: 4 }}>
          {values?.employeeId || '+91 ' + user?.mobile || t("No Contact Added")}
        </Text>
      </View>

      {!isProfileComplete ? (
        <View style={styles.incompleteCard}>
          <MaterialIcons 
            name={seDraft ? "pending-actions" : "warning"} 
            size={40} 
            color={colors.warning} 
            style={{ marginBottom: spacing.md }} 
          />
          <Text style={{ fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm }}>
            {seDraft ? t("Profile In Progress") : t("Profile Incomplete")}
          </Text>

          {seDraft ? (
            <View style={{ width: '100%', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                {t("Completion Status")}
              </Text>
              <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '800' }}>
                {Math.round(((seDraft.step - 1) / 6) * 100)}%
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View style={{ height: 6, backgroundColor: '#FEF3C7', borderRadius: 3, overflow: 'hidden' }}>
              {/* ---> BUG FIX: Aligned the bar width calculation to match the text percentage <--- */}
              <View style={{ width: `${((seDraft.step - 1) / 6) * 100}%`, height: '100%', backgroundColor: colors.warning, borderRadius: 3 }} />
            </View>
            
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 12, fontWeight: '600', fontSize: 13, lineHeight: 20 }}>
              {t("You are on Step {{current}} of 6. Finish the remaining steps.", { current: seDraft.step })}
            </Text>
          </View>
          ) : (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg, fontWeight: '600', lineHeight: 20 }}>
              {t("You must complete your onboarding to unlock all network features.")}
            </Text>
          )}

          <Button 
            label={seDraft ? t("Resume Onboarding") : t("Complete Profile Now")} 
            icon="arrow-forward"
            iconPosition="right"
            onPress={() => navigation.navigate('SEOnboardingScreen')} 
          />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
            <StatBox title={t('Dealers')} count={counts.dealers} icon="storefront" color={colors.primary} />
            <StatBox title={t('Farmers')} count={counts.farmers} icon="agriculture" color={colors.success} />
            <StatBox title={t('Distributors')} count={counts.distributors} icon="domain" color={colors.warning} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t("Personal Details")}</Text></View>
            <DataRow label="Date of Birth" value={values.dob} />
            <DataRow label="Blood Group" value={values.bloodGroup} />
            <DataRow label="Mobile Number" prefix="+91" value={values.mobileNumber} />
            <DataRow label="Emergency Contact" prefix="+91" value={values.emergencyContact} />
            <DataRow label="Email ID" value={values.emailId} />
            <DataRow label="Address" value={values.permanentAddress} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t("Work Assignment")}</Text></View>
            <DataRow label="Designation" value={values.designation} />
            <DataRow label="Reporting Manager" value={values.reportingTo} />
            <DataRow label="Headquarter" value={values.headquarter} />
            <DataRow label="Territory" value={values.territory} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t("Statutory & Financial")}</Text></View>
            <DataRow label="PAN Number" value={values.panNumber} />
            <DataRow label="Bank Name" value={values.bankName} />
            <DataRow label="Account Number" value={values.bankAccountNumber} />
            <DataRow label="IFSC Code" value={values.bankIfsc} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t("Assets & Logistics")}</Text></View>
            <DataRow label="Vehicle Type" value={`${values.vehicleType} (${values.vehicleNumber || 'N/A'})`} />
            <DataRow label="Driving License No" value={values.drivingLicenseNo} />
            <DataRow label="Company Assets Issued" value={values.companyAssets} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t("Documents")}</Text></View>
            <DocRow label="Aadhar Card" url={values.documents?.aadharCard} />
            <DocRow label="PAN Card" url={values.documents?.panCard} />
            <DocRow label="Address Proof" url={values.documents?.addressProof} />
          </View>
        </>
      )}

      {/* Preferences */}
      <Text style={styles.prefTitle}>{t('Change Language')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] }}>
        {['en', 'gu', 'hi'].map((lng) => (
          <Pressable key={lng} onPress={() => changeLanguage(lng)} style={[styles.langBtn, i18n.language === lng && styles.langBtnActive]}>
            <Text style={[styles.langText, i18n.language === lng && { color: '#FFF' }]}>
              {lng === 'en' ? 'ENG' : lng === 'gu' ? 'ગુજરાતી' : 'हिंदी'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button label={t('Logout')} variant="danger" onPress={logout} icon="logout" iconPosition="right" />
      <View style={{ height: 40 }} />

      {/* Image Viewer Modal */}
      <Modal visible={!!viewerUrl} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.closeBtn} onPress={() => setViewerUrl(null)}>
            <MaterialIcons name="close" size={32} color="#FFF" />
          </Pressable>
          {viewerUrl && <Image source={{ uri: viewerUrl }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, overflow: 'hidden', borderWidth: 3, borderColor: colors.primarySoft },
  incompleteCard: { backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
  sectionHeader: { marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },
  dataRow: { marginBottom: 16 },
  label: { color: colors.textMuted, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { color: colors.text, fontWeight: '700', fontSize: 16 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  docLabel: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  viewText: { color: '#166534', fontWeight: '800', fontSize: 12, marginLeft: 4 },
  missingBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  missingText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  statBox: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', ...shadows.soft },
  statTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 4, textTransform: 'uppercase', textAlign: 'center' },
  prefTitle: { fontSize: 14, fontWeight: '800', color: colors.textMuted, marginBottom: spacing.md, textTransform: 'uppercase' },
  langBtn: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  langBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langText: { fontWeight: '800', color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullImage: { width: '95%', height: '80%' }
});