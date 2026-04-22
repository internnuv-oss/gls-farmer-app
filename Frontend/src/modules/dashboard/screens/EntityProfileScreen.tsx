import React, { useState } from 'react';
import { View, Text, Alert, Pressable, ActivityIndicator, Modal, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { documentDirectory, downloadAsync, cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SimpleScreenTemplate } from '../../../design-system/templates/Templates';
import { Button } from '../../../design-system/components/Button';
import { deleteDealer } from '../services/dashboardService';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';

const DetailRow = ({ label, value }: { label: string, value: any }) => (
  <View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontWeight: '700', flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '800', flex: 1.5, textAlign: 'right' }}>{value || '-'}</Text>
    </View>
    <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />
  </View>
);

export const EntityProfileScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { entity } = route.params;
  const raw = entity.raw; 
  
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false); // State for the 3-dot dropdown menu

  const getScoreColor = (score: number) => {
    if (score > 60) return '#3730A3'; // Elite (Premium Deep Indigo)
    if (score >= 46) return '#166534'; // A-Category (Solid Forest Green)
    if (score >= 26) return '#B45309'; // B-Category (Rich Amber / Bronze)
    return '#991B1B';                  // C-Category (Crimson Red)
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleEdit = () => {
    navigation.navigate("DealerOnboarding", { editData: raw });
  };

  const handleDelete = () => {
    Alert.alert("Delete Profile", "Are you sure you want to delete this profile? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDealer(entity.id);
            navigation.goBack();
          } catch(e: any) {
            Alert.alert("Error", e.message);
          }
      }}
    ]);
  };

  const getLocalFileUri = (fileName: string) => {
    const dir = documentDirectory || cacheDirectory;
    return `${dir}${fileName}`;
  };

  const handleDownloadPDF = async () => {
    if (!raw.pdf_url) return Alert.alert("Not Found", "PDF document is not available.");
    setDownloading(true);
    try {
      const fileName = `${raw.shop_name.replace(/[^a-zA-Z0-9]/g, '_')}_Dossier.pdf`;
      // Use documentDirectory directly
      const fileUri = `${documentDirectory}${fileName}`; 
      
      const { uri } = await downloadAsync(raw.pdf_url, fileUri);
      
      await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Save PDF' });
    } catch (error) {
      console.log("Download Error:", error);
      Alert.alert("Error", "Failed to download the PDF document.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSharePDF = async () => {
    if (!raw.pdf_url) return Alert.alert("Not Found", "PDF document is not available.");
    setSharing(true);
    try {
      const fileName = `${raw.shop_name.replace(/[^a-zA-Z0-9]/g, '_')}_Dossier.pdf`;
      // Use documentDirectory directly
      const fileUri = `${documentDirectory}${fileName}`; 
      
      const { uri } = await downloadAsync(raw.pdf_url, fileUri);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.log("Share Error:", error);
      Alert.alert("Error", "Failed to share the PDF document.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <SimpleScreenTemplate 
      title={t('Profile Overview')} 
      onBack={() => navigation.navigate("Dashboard")}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <View>
          <Pressable onPress={() => setMenuVisible(true)} style={{ padding: spacing.xs, marginRight: -spacing.sm }}>
            <MaterialIcons name="more-vert" size={28} color={colors.text} />
          </Pressable>

          {/* Transparent Overlay Modal for the Dropdown Menu */}
          <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
            <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)}>
              <View style={{
                position: 'absolute',
                top: Math.max(insets.top, 24) + 45, // Aligns perfectly below the header
                right: spacing.lg,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                width: 170,
                ...shadows.medium,
                elevation: 5 // Android shadow
              }}>
                <Pressable 
                  onPress={() => { setMenuVisible(false); handleEdit(); }} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <MaterialIcons name="edit" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{t('Edit Profile')}</Text>
                </Pressable>

                <Pressable 
                  onPress={() => { setMenuVisible(false); handleDelete(); }} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}
                >
                  <MaterialIcons name="delete" size={18} color={colors.danger} style={{ marginRight: spacing.sm }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger }}>{t('Delete Profile')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </View>
      }
    >
      <View style={{ backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
          <MaterialIcons name={entity.type === 'Dealer' ? 'storefront' : 'agriculture'} size={40} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center' }}>{entity.name}</Text>
        <View style={{ backgroundColor: colors.screen, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, marginTop: 8, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>{entity.type}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, alignItems: 'center' }}>
          <MaterialIcons name="speed" size={28} color={getScoreColor(entity.score)} style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 26, fontWeight: '900', color: getScoreColor(entity.score) }}>{entity.score}</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginTop: 4 }}>{t('PROFILE SCORE')}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, alignItems: 'center' }}>
          <MaterialIcons name="location-city" size={28} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' }} numberOfLines={2}>
            {raw.city && raw.state ? `${raw.city}, ${raw.state}` : (entity.location || '-')}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginTop: 4 }}>{t('LOCATION')}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: spacing.lg }}>{t('Basic Information')}</Text>
        <DetailRow label="Contact Person" value={raw.owner_name} />
        <DetailRow label="Mobile Number" value={`+91 ${raw.contact_mobile}`} />
        <DetailRow label="Address" value={raw.address} />
        <DetailRow label="Landmark" value={raw.landmark} />
        <DetailRow label="GST Number" value={raw.gst_number} />
        <DetailRow label="PAN Number" value={raw.pan_number} />
        <DetailRow label="Est. Year" value={raw.est_year} />
        <DetailRow label="Firm Type" value={raw.firm_type} />
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>{t('Onboarding Status')}</Text>
          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm }}>
            <Text style={{ color: '#166534', fontWeight: '800', fontSize: 12 }}>{t('Approved')}</Text>
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: spacing.lg }}>{t('Bank Details')}</Text>
        <DetailRow label="Bank Name" value={raw.bank_details?.bankName} />
        <DetailRow label="Branch" value={raw.bank_details?.bankBranch} />
        <DetailRow label="Account Name" value={raw.bank_details?.accountName} />
        <DetailRow label="Account Number" value={raw.bank_details?.accountNo} />
        <DetailRow label="IFSC Code" value={raw.bank_details?.ifsc} />
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: spacing.lg }}>{t('Business Area & Status')}</Text>
        <DetailRow label="Major Crops" value={raw.commitments?.majorCrops?.join(', ')} />
        <DetailRow label="Acres Served" value={raw.commitments?.acresServed ? `${raw.commitments.acresServed} Acres` : '-'} />
        <DetailRow label="Proposed Status" value={raw.commitments?.proposedStatus} />
        <DetailRow label="Willing Demo Farmers" value={raw.commitments?.willingDemoFarmers} />
        
        <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.sm }}>Linked Distributors:</Text>
        {raw.commitments?.linkedDistributors?.map((dist: any, i: number) => (
          <Text key={i} style={{ color: colors.text, fontWeight: '700', marginBottom: 4 }}>
            • {dist.name} ({dist.contact})
          </Text>
        ))}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: spacing.lg }}>{t('Scoring Breakdown')}</Text>
        <DetailRow label="Financial Health" value={`${raw.scoring?.financial || 0} / 10`} />
        <DetailRow label="Market Reputation" value={`${raw.scoring?.reputation || 0} / 10`} />
        <DetailRow label="Operations & Infra" value={`${raw.scoring?.operations || 0} / 10`} />
        <DetailRow label="Farmer Network" value={`${raw.scoring?.farmerNetwork || 0} / 10`} />
        <DetailRow label="Team & Professionalism" value={`${raw.scoring?.team || 0} / 10`} />
        <DetailRow label="Portfolio" value={`${raw.scoring?.portfolio || 0} / 10`} />
        <DetailRow label="Experience" value={`${raw.scoring?.experience || 0} / 10`} />
        <DetailRow label="Growth Orientation" value={`${raw.scoring?.growth || 0} / 10`} />
        
        {raw.scoring?.redFlags && (
          <View style={{ backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.sm, marginTop: spacing.sm }}>
            <Text style={{ color: '#991B1B', fontWeight: '800', marginBottom: 4 }}>Red Flags Noted:</Text>
            <Text style={{ color: '#991B1B', fontWeight: '500' }}>{raw.scoring.redFlags}</Text>
          </View>
        )}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, padding: spacing.lg, marginBottom: spacing.xl }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: spacing.lg }}>{t('Commitments & Compliance')}</Text>
        
        <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm }}>GLS Commitments Accepted:</Text>
        {raw.commitments?.glsCommitments?.map((item: string, i: number) => (
          <Text key={i} style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>✓ {item}</Text>
        ))}

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

        <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm }}>Regulatory Documents Verified:</Text>
        {raw.commitments?.complianceChecklist?.map((item: string, i: number) => (
          <Text key={i} style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>✓ {item}</Text>
        ))}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, padding: spacing.lg, marginBottom: spacing.xl }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: spacing.lg }}>{t('Uploaded Documents')}</Text>
        
        {raw.documents && Object.keys(raw.documents).length > 0 ? (
          Object.entries(raw.documents).map(([key, url]) => (
            <Pressable 
              key={key} 
              onPress={() => Linking.openURL(url as string)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}
            >
              <MaterialIcons name="insert-drive-file" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' }}>
                {key.toUpperCase().replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: colors.textMuted, fontWeight: '500' }}>No documents uploaded.</Text>
        )}
      </View>

      {/* Two minimal separate buttons for PDF actions */}
      <View style={{ marginBottom: spacing.lg }}>
        {raw.pdf_url ? (
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            <Pressable 
              onPress={handleDownloadPDF} 
              disabled={downloading}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md }}
            >
              {downloading ? <ActivityIndicator color={colors.primary} /> : (
                <>
                  <MaterialIcons name="file-download" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Download</Text>
                </>
              )}
            </Pressable>

            <Pressable 
              onPress={handleSharePDF} 
              disabled={sharing}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, backgroundColor: colors.primary, borderRadius: radius.md }}
            >
              {sharing ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialIcons name="share" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#FFF", fontWeight: '700' }}>Share</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={{ marginBottom: spacing.md }}>
            <Button 
              label="Generate PDF Dossier" 
              variant="secondary"
              onPress={handleEdit} 
            />
          </View>
        )}
      </View>
    </SimpleScreenTemplate>
  );
};