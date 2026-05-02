import React, { useState } from 'react';
import { View, Text, Alert, Pressable, ActivityIndicator, Modal, Image, Platform, ScrollView, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { documentDirectory, cacheDirectory, downloadAsync, StorageAccessFramework, EncodingType, readAsStringAsync, writeAsStringAsync, getContentUriAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { SimpleScreenTemplate } from '../../../design-system/templates/Templates';
import { Button } from '../../../design-system/components/Button';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useAlertStore } from '../../../store/alertStore';

// --- Reusable UI Components --- //

const SectionCard = ({ title, icon, children }: { title: string, icon?: any, children: React.ReactNode }) => (
  <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, padding: spacing.lg, marginBottom: spacing.lg }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm }}>
      {icon && <MaterialIcons name={icon} size={22} color={colors.primary} style={{ marginRight: 8 }} />}
      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>{title}</Text>
    </View>
    {children}
  </View>
);

const DetailRow = ({ label, value, isVertical = false }: { label: string, value: any, isVertical?: boolean }) => {
  const displayValue = (!value || value === '' || (Array.isArray(value) && value.length === 0)) ? 'N/A' : value;
  
  if (isVertical) {
    return (
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
        <View>{typeof displayValue === 'string' ? <Text style={{ color: colors.text, fontWeight: '600', lineHeight: 20 }}>{displayValue}</Text> : displayValue}</View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontWeight: '700', flex: 1, marginRight: spacing.sm }}>{label}</Text>
      <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
        {typeof displayValue === 'string' ? <Text style={{ color: colors.text, fontWeight: '800', textAlign: 'right' }}>{displayValue}</Text> : displayValue}
      </View>
    </View>
  );
};

const PillList = ({ items, align = 'flex-end' }: { items: any[], align?: 'flex-start' | 'flex-end' | 'center' }) => {
  if (!items || items.length === 0) return <Text style={{ color: colors.text, fontWeight: '800' }}>N/A</Text>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: align }}>
      {items.map((item, i) => (
        <View key={i} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{item.name || item}</Text>
        </View>
      ))}
    </View>
  );
};

const AudioPlayer = ({ url, title = "Voice Note" }: { url?: string, title?: string }) => {
  // FIX: expo-audio requires remote URLs to be explicitly passed inside an object
  const audioSource = React.useMemo(() => {
    if (!url) return null;
    return url.startsWith('http') ? { uri: url } : url;
  }, [url]);

  const player = useAudioPlayer(audioSource);
  const playerStatus = useAudioPlayerStatus(player);

  if (!url) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const togglePlayback = () => {
    if (!player) return;
    if (playerStatus.playing) {
      player.pause();
    } else {
      // Reset to beginning if playback already finished
      if (playerStatus.currentTime >= playerStatus.duration - 0.1 && playerStatus.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const durationSec = playerStatus.duration || 0;
  const currentSec = playerStatus.currentTime || 0;
  const progressPct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;
  
  // If the duration is 0, the audio is still buffering from the network
  const isLoading = durationSec === 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 8, borderRadius: radius.md, marginTop: 4, borderWidth: 1, borderColor: '#BBF7D0' }}>
      <Pressable onPress={togglePlayback} disabled={isLoading} style={{ padding: 8, backgroundColor: '#FFF', borderRadius: 20, ...shadows.soft }}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={20} color={colors.primary} />
        )}
      </Pressable>
      
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>{title}</Text>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {isLoading ? "Loading..." : `${formatTime(currentSec)} / ${formatTime(durationSec)}`}
          </Text>
        </View>
        <View style={{ height: 4, backgroundColor: '#BBF7D0', borderRadius: 2, width: '100%', overflow: 'hidden' }}>
          <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 2 }} />
        </View>
      </View>
    </View>
  );
};

// Custom component to handle Phone Calls
const ActionablePhone = ({ phone }: { phone: string }) => {
  if (!phone) return <Text style={{ color: colors.text, fontWeight: '800' }}>N/A</Text>;
  return (
    <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <MaterialIcons name="phone" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '800', textDecorationLine: 'underline' }}>+91 {phone}</Text>
    </Pressable>
  );
};

// Custom component to handle Google Maps Navigation
const ActionableMap = ({ lat, lng, label }: { lat: number, lng: number, label: string }) => {
  return (
    <Pressable onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', marginRight: 6, textDecorationLine: 'underline' }}>{label}</Text>
      <MaterialIcons name="map" size={16} color={colors.primary} />
    </Pressable>
  );
};


export const EntityProfileScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { entity } = route.params;
  const raw = entity.raw; 
  
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<string | null>(null);
  const [openingDocUrl, setOpeningDocUrl] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score > 60) return '#3730A3';
    if (score >= 46) return '#166534';
    if (score >= 26) return '#B45309';
    return '#991B1B';
  };

  const ScoreRow = ({ label, score, remark, audio }: any) => (
    <View style={{ marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
        <Text style={{ color: getScoreColor(score), fontWeight: '900', fontSize: 16 }}>{score}/10</Text>
      </View>
      {remark ? <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginBottom: 4 }}>"{remark}"</Text> : null}
      <AudioPlayer url={audio} />
    </View>
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleEdit = () => {
    navigation.navigate("DealerOnboarding", { editData: raw });
  };

  const downloadFile = async (url: string, defaultFileName: string) => {
    setDownloading(true);
    try {
      const tempUri = `${documentDirectory}${defaultFileName}`; 
      
      if (Platform.OS === 'android') {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          const result = await downloadAsync(url, tempUri);
          if (result.status !== 200) {
            useAlertStore.getState().showAlert("Download Error", "Could not access the file from the server.");
            return;
          }
          
          const base64 = await readAsStringAsync(result.uri, { encoding: EncodingType.Base64 });
          const mimeType = url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '*/*';
          const savedUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, defaultFileName, mimeType);
          await writeAsStringAsync(savedUri, base64, { encoding: EncodingType.Base64 });
          
          useAlertStore.getState().showAlert("✅ Download Complete", `File saved as:\n${defaultFileName}\n\nCheck your device's Files or Downloads folder.`);
        }
      } else {
        const result = await downloadAsync(url, tempUri);
        if (result.status !== 200) {
          useAlertStore.getState().showAlert("Download Error", "Could not access the file.");
          return;
        }
        const mimeType = url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
        await Sharing.shareAsync(result.uri, { UTI: 'public.data', mimeType, dialogTitle: 'Save File' });
      }
    } catch (error) {
      useAlertStore.getState().showAlert("Error", "Failed to download the file. Check your connection.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!raw.pdf_url) return useAlertStore.getState().showAlert("Not Found", "PDF document is not available.");
    const safeName = (raw.primary_shop_name || "Dealer").replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeName}_Dossier.pdf`;
    downloadFile(raw.pdf_url, fileName);
  };

  const handleSharePDF = async () => {
    if (!raw.pdf_url) return useAlertStore.getState().showAlert("Not Found", "PDF document is not available.");
    setSharing(true);
    try {
      const safeName = (raw.primary_shop_name || "Dealer").replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${safeName}_Dossier.pdf`;
      const fileUri = `${documentDirectory}${fileName}`; 
      
      const result = await downloadAsync(raw.pdf_url, fileUri);
      
      if (result.status !== 200) return useAlertStore.getState().showAlert("Share Error", "Could not access the PDF.");
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
      } else {
        useAlertStore.getState().showAlert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      useAlertStore.getState().showAlert("Error", "Failed to share the PDF document.");
    } finally {
      setSharing(false);
    }
  };

  const handleViewDocument = async (key: string, url: string) => {
    const isPdfOrRaw = url.toLowerCase().endsWith('.pdf') || url.includes('/raw/upload') || url.match(/\.(doc|docx|xls|xlsx|csv)$/i);
    
    if (isPdfOrRaw) {
      setOpeningDocUrl(url); 
      try {
        let ext = 'pdf';
        let mimeType = 'application/pdf';
        let uti = 'com.adobe.pdf';

        if (url.toLowerCase().includes('.xlsx')) { ext = 'xlsx'; mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; uti = 'com.microsoft.excel.xls'; }
        else if (url.toLowerCase().includes('.xls')) { ext = 'xls'; mimeType = 'application/vnd.ms-excel'; uti = 'com.microsoft.excel.xls'; }
        else if (url.toLowerCase().includes('.csv')) { ext = 'csv'; mimeType = 'text/csv'; uti = 'public.comma-separated-values-text'; }
        else if (url.toLowerCase().includes('.docx')) { ext = 'docx'; mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; uti = 'org.openxmlformats.wordprocessingml.document'; }
        else if (url.toLowerCase().includes('.doc')) { ext = 'doc'; mimeType = 'application/msword'; uti = 'com.microsoft.word.doc'; }
        
        const cleanKeyName = key.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `secure_${cleanKeyName}_${Date.now()}.${ext}`;
        const localUri = `${cacheDirectory}${fileName}`;
        
        const result = await downloadAsync(url, localUri);
        
        if (result.status === 200) {
          if (Platform.OS === 'android') {
            const contentUri = await getContentUriAsync(result.uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1, 
              type: mimeType
            });
          } else {
            await Sharing.shareAsync(result.uri, { UTI: uti, mimeType: mimeType });
          }
        } else {
          useAlertStore.getState().showAlert("Error", "Could not load the document from the server.");
        }
      } catch (error) {
        console.error(error);
        useAlertStore.getState().showAlert("Error", "An error occurred while opening the document natively.");
      } finally {
        setOpeningDocUrl(null);
      }
    } else {
      setViewerDoc(url); 
    }
  };

  // Safe extractions
  const banks = raw.bank_details || [];
  const annexures = raw.annexures || {};
  const scoring = raw.scoring || {};
  const linkedDistributors = raw.distributor_links?.distributors || [];
  const addShops = raw.additional_locations?.shops || [];
  const godowns = raw.additional_locations?.godowns || [];
  const gpsExt = raw.primary_shop_location?.gps?.exterior;

  return (
    <SimpleScreenTemplate 
      title={t('Profile Overview')} 
      onBack={() => navigation.goBack()}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <View>
          <Pressable onPress={() => setMenuVisible(true)} style={{ padding: spacing.xs, marginRight: -spacing.sm }}>
            <MaterialIcons name="more-vert" size={28} color={colors.text} />
          </Pressable>

          <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
            <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)}>
              <View style={{ position: 'absolute', top: Math.max(insets.top, 24) + 45, right: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, width: 170, ...shadows.medium, elevation: 5 }}>
                <Pressable onPress={() => { setMenuVisible(false); handleEdit(); }} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
                  <MaterialIcons name="edit" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{t('Edit Profile')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* --- HEADER BANNER --- */}
        <View style={{ backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
            <MaterialIcons name={entity.type === 'Dealer' ? 'storefront' : 'agriculture'} size={40} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center' }}>{entity.name}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: spacing.sm }}>
            <View style={{ backgroundColor: colors.screen, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>{entity.type}</Text>
            </View>
            
            <View style={{ backgroundColor: colors.screen, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                Since {raw.created_at ? new Date(raw.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </Text>
            </View>

            <View style={{ backgroundColor: raw.status === 'SUBMITTED' ? '#DCFCE7' : '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: raw.status === 'SUBMITTED' ? '#BBF7D0' : '#E2E8F0' }}>
              <Text style={{ color: raw.status === 'SUBMITTED' ? '#166534' : colors.textMuted, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>
                {raw.status === 'SUBMITTED' ? 'Approved' : 'Draft'}
              </Text>
            </View>
          </View>
        </View>

        {/* --- SCORE & LOCATION WIDGETS --- */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, alignItems: 'center', justifyContent: 'space-between' }}>
            <MaterialIcons name="speed" size={28} color={getScoreColor(entity.score)} style={{ marginBottom: 8 }} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: getScoreColor(entity.score) }}>{entity.score}</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginTop: 8 }}>{t('PROFILE SCORE')}</Text>
          </View>

          <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, alignItems: 'center', justifyContent: 'space-between' }}>
            <MaterialIcons name="location-city" size={28} color={colors.primary} style={{ marginBottom: 8 }} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, textAlign: 'center', lineHeight: 20 }} numberOfLines={2}>
                {raw.primary_shop_location?.city && raw.primary_shop_location?.state ? `${raw.primary_shop_location.city}, ${raw.primary_shop_location.state}` : 'N/A'}
              </Text>
            </View>
            
            {/* Added Interactive Map Button */}
            {gpsExt?.lat && gpsExt?.lng ? (
              <Pressable onPress={() => Linking.openURL(`https://maps.google.com/?q=${gpsExt.lat},${gpsExt.lng}`)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <MaterialIcons name="map" size={14} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: "#2563EB" }}>VIEW ON MAP</Text>
              </Pressable>
            ) : (
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginTop: 8 }}>{t('LOCATION')}</Text>
            )}
          </View>
        </View>

        {/* --- 1. BUSINESS PROFILE --- */}
        <SectionCard title="1. Business Profile" icon="business-center">
          <DetailRow label="Primary Shop Name" value={raw.primary_shop_name} />
          <DetailRow label="Contact Person" value={raw.contact_person} />
          <DetailRow label="Owner(s) / Partner(s)" value={<PillList items={raw.owners_list || []} />} />
          <DetailRow label="Mobile Number" value={raw.contact_mobile ? <ActionablePhone phone={raw.contact_mobile} /> : ''} />
          <DetailRow label="Landline Number" value={raw.landline_number} />
          <DetailRow label="Primary Address" value={raw.primary_address} isVertical />
          <DetailRow label="Landmark" value={raw.landmark} />
          <DetailRow label="Firm Type" value={raw.firm_type} />
          <DetailRow label="Established Year" value={raw.est_year} />
          <DetailRow label="GST Number" value={raw.gst_number} />
          <DetailRow label="PAN Number" value={raw.pan_number} />
        </SectionCard>

        {/* --- 2. BANK DETAILS --- */}
        <SectionCard title="2. Bank Details" icon="account-balance">
          {banks.length > 0 ? banks.map((bank: any, i: number) => (
            <View key={i} style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: i !== banks.length - 1 ? spacing.md : 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: spacing.sm }}>Account {i + 1} <Text style={{ color: colors.textMuted }}>({bank.accountType || 'Unknown Type'})</Text></Text>
              <DetailRow label="Bank Name" value={bank.bankName} />
              <DetailRow label="Branch" value={bank.bankBranch} />
              <DetailRow label="A/C Name" value={bank.accountName} />
              <DetailRow label="A/C Number" value={bank.accountNumber} />
              <DetailRow label="IFSC Code" value={bank.bankIfsc} />
            </View>
          )) : <Text style={{ color: colors.textMuted, fontWeight: '600', fontStyle: 'italic' }}>No bank details recorded.</Text>}
        </SectionCard>

        {/* --- 3. PROFILING & EVALUATION --- */}
        <SectionCard title="3. Profiling & Evaluation" icon="assignment-turned-in">
          <ScoreRow label="Financial Health" score={scoring.financial || 0} remark={scoring.remarks?.financial} audio={scoring.audio?.financial} />
          <ScoreRow label="Market Reputation" score={scoring.reputation || 0} remark={scoring.remarks?.reputation} audio={scoring.audio?.reputation} />
          <ScoreRow label="Operations & Infra" score={scoring.operations || 0} remark={scoring.remarks?.operations} audio={scoring.audio?.operations} />
          <ScoreRow label="Farmer Network" score={scoring.farmerNetwork || 0} remark={scoring.remarks?.farmerNetwork} audio={scoring.audio?.farmerNetwork} />
          <ScoreRow label="Team & Professionalism" score={scoring.team || 0} remark={scoring.remarks?.team} audio={scoring.audio?.team} />
          <ScoreRow label="Portfolio Alignment" score={scoring.portfolio || 0} remark={scoring.remarks?.portfolio} audio={scoring.audio?.portfolio} />
          <ScoreRow label="Experience" score={scoring.experience || 0} remark={scoring.remarks?.experience} audio={scoring.audio?.experience} />
          <ScoreRow label="Growth Orientation" score={scoring.growth || 0} remark={scoring.remarks?.growth} audio={scoring.audio?.growth} />
          
          <View style={{ backgroundColor: '#FEF2F2', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', marginTop: spacing.sm }}>
            <Text style={{ color: '#991B1B', fontWeight: '800', marginBottom: 4 }}>Red Flags Noted:</Text>
            <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13, marginBottom: scoring.audio?.redFlags ? 8 : 0 }}>{scoring.redFlags || 'None Reported'}</Text>
            <AudioPlayer url={scoring.audio?.redFlags} title="Alert Audio" />
          </View>
        </SectionCard>

        {/* --- 4. BUSINESS INFRA & STATUS --- */}
        <SectionCard title="4. Business Infrastructure" icon="store">
          <DetailRow label="Proposed Status" value={raw.proposed_status} />
          <DetailRow label="Willing Demo Farmers" value={raw.demo_farmers_data?.willing} />
          
          {/* Actionable Map component for GPS Coordinates */}
          {gpsExt && <DetailRow label="GPS Coordinates" value={<ActionableMap lat={gpsExt.lat} lng={gpsExt.lng} label={`${gpsExt.lat.toFixed(5)}, ${gpsExt.lng.toFixed(5)}`} />} />}

          <Text style={{ color: colors.textMuted, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm }}>Linked Distributors:</Text>
          {linkedDistributors.length > 0 ? linkedDistributors.map((d: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialIcons name="link" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.text, fontWeight: '700' }}>{d.name} <Text style={{ color: colors.textMuted }}>({d.contact})</Text></Text>
            </View>
          )) : <Text style={{ color: colors.text, fontWeight: '700' }}>N/A</Text>}

          {addShops.length > 0 && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={{ color: colors.primary, fontWeight: '800', marginBottom: spacing.sm }}>Additional Shops ({addShops.length})</Text>
              {addShops.map((s: any, i: number) => (
                <View key={i} style={{ backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.sm, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontWeight: '800', color: colors.text }}>{s.shopName} <Text style={{ fontWeight: '500', color: colors.textMuted }}>({s.estYear})</Text></Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{s.address}, {s.city}</Text>
                </View>
              ))}
            </View>
          )}

          {godowns.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.primary, fontWeight: '800', marginBottom: spacing.sm }}>Godowns ({godowns.length})</Text>
              {godowns.map((g: any, i: number) => (
                <View key={i} style={{ backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.sm, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontWeight: '800', color: colors.text }}>Capacity: {g.capacity} {g.capacityUnit}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{g.address}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        {/* --- 5. COMMERCIAL ANNEXURES --- */}
        <SectionCard title="5. Commercial Annexures" icon="request-quote">
          
          <Text style={{ color: colors.primary, fontWeight: '800', marginBottom: spacing.sm }}>Territory Coverage</Text>
          {annexures.territories?.map((t: any, i: number) => (
            <View key={i} style={{ backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t.taluka}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Villages: {t.village?.join(', ') || 'N/A'}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{t.cultivableArea} Acres | {t.majorCrops?.join(', ')}</Text>
            </View>
          ))}

          <DetailRow label="Principal Suppliers" value={<PillList items={annexures.principalSuppliers || []} align="flex-start" />} isVertical />
          <DetailRow label="Chemical Range" value={<PillList items={annexures.chemicalProducts || []} align="flex-start" />} isVertical />
          <DetailRow label="Bio/Organic Range" value={<PillList items={annexures.bioProducts || []} align="flex-start" />} isVertical />
          <DetailRow label="Other Products" value={<PillList items={annexures.otherProducts || []} align="flex-start" />} isVertical />
          
          <DetailRow label="Will Share Sales Data?" value={annexures.willShareSales ? 'Yes, Confirmed' : 'Not Confirmed'} />
          
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: 4 }}>2-Year Growth Vision</Text>
            <Text style={{ color: colors.text, fontWeight: '600', fontStyle: 'italic', marginBottom: annexures.growthVisionAudio ? 4 : 0 }}>"{annexures.growthVision || 'N/A'}"</Text>
            <AudioPlayer url={annexures.growthVisionAudio} title="Vision Audio" />
          </View>

          <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md }}>Credit References:</Text>
          {annexures.hasCreditReferences === 'Yes' && annexures.creditReferences?.length > 0 ? annexures.creditReferences.map((ref: any, i: number) => (
            <View key={i} style={{ backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.sm, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{ref.name} <Text style={{ fontWeight: '500', color: colors.textMuted }}>({ref.contact})</Text></Text>
              {ref.behavior && <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>"{ref.behavior}"</Text>}
              <AudioPlayer url={ref.behaviorAudio} title="Reference Audio" />
            </View>
          )) : <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.md }}>N/A</Text>}

          <DetailRow label="Security Deposit" value={annexures.securityDeposit ? `₹ ${annexures.securityDeposit}` : 'N/A'} />
          <DetailRow label="Payment Media Proof" value={raw.documents?.se_payment_proof ? 'Uploaded ✓' : 'N/A'} />
          <DetailRow label="Payment Reference / Cheque No." value={annexures.paymentProofText} />

        </SectionCard>

        {/* --- 6. COMPLIANCE & MEDIA --- */}
        <SectionCard title="6. Compliance & Media Attachments" icon="verified-user">
          <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm }}>GLS Commitments Accepted:</Text>
          {raw.commitments?.glsCommitments?.length > 0 ? raw.commitments.glsCommitments.map((item: string, i: number) => (
            <Text key={i} style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>✓ {item}</Text>
          )) : <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.md }}>N/A</Text>}

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm }}>Regulatory Documents Verified:</Text>
          {raw.commitments?.complianceChecklist?.length > 0 ? raw.commitments.complianceChecklist.map((item: string, i: number) => (
            <Text key={i} style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>✓ {item}</Text>
          )) : <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.md }}>N/A</Text>}

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          <Text style={{ color: colors.primary, fontWeight: '800', marginBottom: spacing.md }}>Uploaded Documents Directory</Text>
{raw.documents && Object.keys(raw.documents).length > 0 ? (
  Object.entries(raw.documents).flatMap(([key, val]) => {
    const urls = Array.isArray(val) ? val : [val];
    return urls.map((url, index) => {
      if(!url) return null;
      const isPdf = typeof url === 'string' && (url.toLowerCase().endsWith('.pdf') || url.includes('/raw/upload') || url.match(/\.(doc|docx|xls|xlsx|csv)$/i));
      return (
        <Pressable 
          key={`${key}-${index}`} 
          onPress={() => handleViewDocument(key, url as string)} 
          disabled={openingDocUrl === url} // <-- ADDED: Prevent double clicks
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 }}
        >
          <MaterialIcons name={isPdf ? "picture-as-pdf" : "image"} size={24} color={colors.primary} style={{ marginRight: 12 }} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, flex: 1 }}>{key.toUpperCase().replace(/_/g, ' ')} {Array.isArray(val) ? `(${index + 1})` : ''}</Text>
          
          {/* ---> CHANGED: Now strictly checks against the specific URL <--- */}
          {openingDocUrl === url ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="open-in-new" size={20} color={colors.textMuted} />}
        </Pressable>
      );
    });
  })
) : <Text style={{ color: colors.textMuted, fontWeight: '600', fontStyle: 'italic' }}>No documents uploaded.</Text>}
        </SectionCard>

        {/* --- 7. SIGNATURES --- */}
        <SectionCard title="7. Signatures & Approvals" icon="draw">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: raw.dealer_signature ? '#DCFCE7' : '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons name={raw.dealer_signature ? "check" : "close"} size={30} color={raw.dealer_signature ? "#166534" : "#991B1B"} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Dealer</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{raw.dealer_signature ? 'Digitally Signed' : 'Pending'}</Text>
            </View>
            
            <View style={{ height: 40, width: 1, backgroundColor: colors.border }} />

            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: raw.se_signature ? '#DCFCE7' : '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons name={raw.se_signature ? "check" : "close"} size={30} color={raw.se_signature ? "#166534" : "#991B1B"} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Sales Executive</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{raw.se_signature ? 'Digitally Signed' : 'Pending'}</Text>
            </View>
          </View>
        </SectionCard>

        {/* --- PDF ACTIONS --- */}
        <View style={{ marginTop: spacing.lg }}>
          {raw.pdf_url ? (
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable onPress={handleDownloadPDF} disabled={downloading} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, ...shadows.soft }}>
                {downloading ? <ActivityIndicator color={colors.primary} /> : (
                  <><MaterialIcons name="file-download" size={20} color={colors.primary} style={{ marginRight: 8 }} /><Text style={{ color: colors.primary, fontWeight: '800' }}>Download PDF</Text></>
                )}
              </Pressable>
              <Pressable onPress={handleSharePDF} disabled={sharing} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, backgroundColor: colors.primary, borderRadius: radius.md, ...shadows.soft }}>
                {sharing ? <ActivityIndicator color="#FFF" /> : (
                  <><MaterialIcons name="share" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={{ color: "#FFF", fontWeight: '800' }}>Share PDF</Text></>
                )}
              </Pressable>
            </View>
          ) : (
            <Button label="Generate PDF Dossier" variant="secondary" onPress={handleEdit} />
          )}
        </View>

      </ScrollView>

      {/* --- IMAGE VIEWER MODAL --- */}
      <Modal visible={!!viewerDoc} transparent animationType="fade" onRequestClose={() => setViewerDoc(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={{ position: 'absolute', top: Math.max(insets.top, 20), right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }} onPress={() => setViewerDoc(null)}>
            <MaterialIcons name="close" size={28} color="#FFF" />
          </Pressable>
          {viewerDoc && <Image source={{ uri: viewerDoc }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />}
        </View>
      </Modal>

    </SimpleScreenTemplate>
  );
};