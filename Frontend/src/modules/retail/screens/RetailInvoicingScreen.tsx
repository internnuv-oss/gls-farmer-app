import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Linking, TextInput, ScrollView, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Search, Filter } from "lucide-react-native";
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { EmptyState } from '../../../design-system/components';
import { supabase } from '../../../core/supabase';
import { useAuthStore } from '../../../store/authStore';
import { FilterModal, FilterState, defaultFilters } from '../../../design-system/components/FilterModal';
import { useAlertStore } from '../../../store/alertStore';

export const RetailInvoicingScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null); // 🚀 NEW STATE

  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters, sortBy: 'date_desc' });

  useFocusEffect(
    useCallback(() => {
      const fetchOrders = async () => {
        setLoading(true);
        const { data } = await supabase
          .from('retail_orders')
          .select('*')
          .eq('se_id', user?.id)
          .order('created_at', { ascending: false });
        setOrders(data || []);
        setLoading(false);
      };
      fetchOrders();
    }, [user?.id])
  );

  const handleSharePDF = async (url: string, invoiceNo: string) => {
    if (!url) return;
    setDownloadingUrl(url);
    try {
      const fileUri = `${FileSystem.cacheDirectory}Invoice_${invoiceNo}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Invoice' });
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadingUrl(null);
    }
  };

  // 🚀 Native Download PDF Function
  const handleDownloadPDF = async (url: string, invoiceNo: string) => {
    if (!url) return;
    setDownloadingPdfId(invoiceNo);
    
    try {
      if (Platform.OS === 'android') {
        // 1. Prompt Android user to select a download directory
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          // 2. Download the file to a temporary hidden cache first
          const tempUri = `${FileSystem.cacheDirectory}Invoice_${invoiceNo}.pdf`;
          await FileSystem.downloadAsync(url, tempUri);

          // 3. Read the downloaded file as Base64 data
          const base64Data = await FileSystem.readAsStringAsync(tempUri, { encoding: FileSystem.EncodingType.Base64 });

          // 4. Create an empty file in the user's chosen directory
          const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            `Invoice_${invoiceNo}.pdf`,
            'application/pdf'
          );

          // 5. Write the PDF data into that new file
          await FileSystem.writeAsStringAsync(savedUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
          
          useAlertStore.getState().showAlert(t("Success"), t("Invoice downloaded successfully!"));
        }
      } else {
        // iOS Implementation: Apple requires using the Share Sheet to access "Save to Files"
        const fileUri = `${FileSystem.documentDirectory}Invoice_${invoiceNo}.pdf`;
        const { uri } = await FileSystem.downloadAsync(url, fileUri);
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Save Invoice' });
      }
    } catch (error) {
      console.error("Download Error:", error);
      Alert.alert(t("Error"), t("Failed to download the invoice."));
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // 🚀 Dynamic Filtering and Sorting Logic
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.invoice_no?.toLowerCase().includes(q) || 
        item.farmer_name?.toLowerCase().includes(q) ||
        item.farmer_mobile?.includes(q)
      );
    }

    if (filters.paymentMode && filters.paymentMode.length > 0) {
      result = result.filter(item => filters.paymentMode.includes(item.payment_mode));
    }

    if (filters.sortBy === 'date_desc') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (filters.sortBy === 'date_asc') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (filters.sortBy === 'amount_desc') {
      result.sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
    }

    return result;
  }, [orders, searchQuery, filters.sortBy, filters.paymentMode]);

  const isFilterActive = filters.sortBy !== 'date_desc' || filters.paymentMode.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, flex: 1 }}>{t("Order History")}</Text>
      </View>

      {/* 🚀 Search & Sort UI */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.screen, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: "row", marginBottom: spacing.sm, gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48 }}>
            <Search size={20} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("Search invoice, name, or phone...")}
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, marginLeft: spacing.sm, fontSize: 13, fontWeight: "500", color: colors.text }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <MaterialIcons name="cancel" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setIsFilterModalOpen(true)}
            style={{
              width: 48, height: 48,
              backgroundColor: isFilterActive ? colors.primarySoft : colors.surface,
              borderRadius: radius.md, borderWidth: 1,
              borderColor: isFilterActive ? colors.primary : colors.border,
              justifyContent: "center", alignItems: "center",
            }}
          >
            <Filter size={20} color={isFilterActive ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState 
              iconName="receipt-long" 
              title={searchQuery || isFilterActive ? t("No matches found") : t("No Invoices Found")} 
              description={searchQuery || isFilterActive ? t("Try adjusting your search or filters.") : t("You haven't generated any retail invoices yet.")}
              actionLabel={searchQuery || isFilterActive ? t("Clear Filters") : t("Create Invoice")}
              onAction={() => {
                if (searchQuery || isFilterActive) {
                  setSearchQuery('');
                  setFilters({ ...defaultFilters, sortBy: 'date_desc' });
                } else {
                  navigation.navigate('NewInvoiceScreen');
                }
              }}
            />
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{item.invoice_no}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>
                    {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>₹{item.total_amount}</Text>
                  <View style={{ backgroundColor: item.payment_mode === 'UPI' ? '#DCFCE7' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: item.payment_mode === 'UPI' ? '#166534' : '#D97706' }}>{item.payment_mode} PAYMENT</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: radius.md, marginBottom: 16 }}>
                <MaterialIcons name="person" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{item.farmer_name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>+91 {item.farmer_mobile}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable 
                  onPress={() => handleDownloadPDF(item.pdf_url, item.invoice_no)} 
                  disabled={!item.pdf_url || downloadingPdfId === item.invoice_no}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', paddingVertical: 10, borderRadius: radius.md, opacity: item.pdf_url ? 1 : 0.5 }}
                >
                  {downloadingPdfId === item.invoice_no ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <MaterialIcons name="file-download" size={18} color={colors.text} style={{ marginRight: 6 }} />
                      <Text style={{ fontWeight: '700', color: colors.text, fontSize: 13 }}>Download PDF</Text>
                    </>
                  )}
                </Pressable>
                
                <Pressable 
                  onPress={() => handleSharePDF(item.pdf_url, item.invoice_no)} 
                  disabled={!item.pdf_url || downloadingUrl === item.pdf_url}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, paddingVertical: 10, borderRadius: radius.md, opacity: item.pdf_url ? 1 : 0.5 }}
                >
                  {downloadingUrl === item.pdf_url ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <MaterialIcons name="share" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 13 }}>Share PDF</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('NewInvoiceScreen')}
        style={{ position: 'absolute', bottom: 30, right: 20, backgroundColor: colors.primary, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', ...shadows.medium, elevation: 8 }}
      >
        <MaterialIcons name="add" size={32} color="#FFF" />
      </Pressable>

      <FilterModal
        visible={isFilterModalOpen}
        entityType="Invoices"
        currentFilters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
};