import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';

export const TempDealerCard = ({ dealer }: { dealer: any }) => {
  const { t } = useTranslation();

  // Safely extract data accounting for CSV capitalization quirks
  const dealerName = dealer.dealer_name || dealer['Dealer Name'] || dealer.Dealer_Name || 'Unknown Dealer';
  const village = dealer.village || dealer.Village || dealer.VILLAGE || '';
  const contactPerson = dealer.contact_person || dealer['Contact Person'] || dealer.Contact_Person || '';
  const mobile = dealer.mobile || dealer.Mobile || dealer.MOBILE || '';
  const address = dealer.address || dealer.Address || dealer.ADDRESS || '';
  const taluka = dealer.taluka || dealer.Taluka || dealer.TALUKA || '';
  const district = dealer.district || dealer.District || dealer.DISTRICT || '';

  const handleCall = () => {
    if (mobile) {
      const firstNum = String(mobile).split(',')[0].trim();
      Linking.openURL(`tel:${firstNum}`);
    }
  };

  const handleMap = () => {
    const query = `${dealerName}, ${address}`;
    Linking.openURL(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(query)}`);
  };

  const handleWhatsApp = () => {
    const text = `*${dealerName}*\n📍 ${t("Location")}: ${village}, ${taluka}\n👤 ${t("Contact Person")}: ${contactPerson || 'N/A'}\n📞 ${t("Mobile")}: ${mobile || 'N/A'}\n🏢 ${t("Address")}: ${address || 'N/A'}\n\n_Shared via Field Commander_`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  };

  return (
    <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>{dealerName}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 4 }}>
            {t("Contact Person")}: {contactPerson || t('N/A')}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>
            {t("Mobile")}: {mobile || t('N/A')}
          </Text>
        </View>
        <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm }}>
          <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '800' }}>{village}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 }}>
        <Text style={{ fontWeight: '700' }}>{t("Address")}: </Text>
        {address ? `${address}, ` : ''}{taluka}, {district}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
        <Pressable onPress={handleCall} disabled={!mobile} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: mobile ? '#ECFCCB' : '#F1F5F9', paddingVertical: 8, borderRadius: radius.md }}>
          <MaterialIcons name="phone" size={18} color={mobile ? "#65A30D" : colors.textMuted} />
          <Text style={{ marginLeft: 6, fontWeight: '700', fontSize: 13, color: mobile ? "#65A30D" : colors.textMuted }}>{t("Call")}</Text>
        </Pressable>
        
        <Pressable onPress={handleMap} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0E7FF', paddingVertical: 8, borderRadius: radius.md }}>
          <MaterialIcons name="map" size={18} color="#4F46E5" />
          <Text style={{ marginLeft: 6, fontWeight: '700', fontSize: 13, color: "#4F46E5" }}>{t("Map")}</Text>
        </Pressable>

        <Pressable onPress={handleWhatsApp} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#DCFCE7', paddingVertical: 8, borderRadius: radius.md }}>
          <MaterialIcons name="share" size={18} color="#16A34A" />
          <Text style={{ marginLeft: 6, fontWeight: '700', fontSize: 13, color: "#16A34A" }}>{t("Share")}</Text>
        </Pressable>
      </View>
    </View>
  );
};