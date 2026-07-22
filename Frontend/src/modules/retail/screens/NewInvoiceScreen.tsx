import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { Button, Input } from '../../../design-system/components';
import { supabase } from '../../../core/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useAlertStore } from '../../../store/alertStore';
import { uploadFileToCloudinary } from '../../onboarding/services/cloudinaryService';

export const NewInvoiceScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  const [mobile, setMobile] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [farmerDetails, setFarmerDetails] = useState<any>(null); 
  const [searching, setSearching] = useState(false);

  const [inventory, setInventory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  // 🚀 New States for Search & Multi-Select
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      // 🚀 Fetch mrp and batch_number
      const { data } = await supabase
        .from('executive_inventory')
        .select('item_id, batch_number, balance_qty, item_master(name, mrp, uom)')
        .eq('se_id', user?.id)
        .gt('balance_qty', 0);
      setInventory(data || []);
    };
    fetchInventory();
  }, [user?.id]);

  useEffect(() => {
    const fetchFarmer = async () => {
      if (mobile.length !== 10) { setFarmerName(''); setFarmerDetails(null); return; }
      setSearching(true);
      const { data } = await supabase.from('farmers').select('*').eq('mobile', mobile).maybeSingle();
      if (data) {
        setFarmerName(data.full_name);
        setFarmerDetails(data);
      }
      setSearching(false);
    };
    fetchFarmer();
  }, [mobile]);

  // 🚀 Track items uniquely by item_id AND batch_number
  const addToCart = (item: any) => {
    const existing = cart.find(c => c.item_id === item.item_id && c.batch_number === item.batch_number);
    if (existing && existing.qty < item.balance_qty) {
      setCart(cart.map(c => (c.item_id === item.item_id && c.batch_number === item.batch_number) ? { ...c, qty: c.qty + 1 } : c));
    } else if (!existing) {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (itemId: string, batchNumber: string) => {
    const existing = cart.find(c => c.item_id === itemId && c.batch_number === batchNumber);
    if (existing.qty > 1) {
      setCart(cart.map(c => (c.item_id === itemId && c.batch_number === batchNumber) ? { ...c, qty: c.qty - 1 } : c));
    } else {
      setCart(cart.filter(c => !(c.item_id === itemId && c.batch_number === batchNumber)));
    }
  };

  const handleCaptureProof = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled) setProofImage(result.assets[0].uri);
  };

  // 🚀 Pure MRP Calculation (No Tax Logic)
  const grandTotal = cart.reduce((sum, c) => sum + (c.item_master.mrp * c.qty), 0);

  const generatePDFHTML = (invoiceNo: string, dateStr: string) => {
    const address = farmerDetails?.village ? `${farmerDetails.village}, ${farmerDetails.personal_details?.taluka || ''}, Dist. ${farmerDetails.personal_details?.city || ''}` : 'Gujarat';
    
    // 🚀 Cleaned up table rows: Removed HSN, Discount, SKU. Added Batch
    const rowsHtml = cart.map((c, i) => {
      const amount = c.item_master.mrp * c.qty;
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${c.item_master.name}</strong><br><span style="font-size:10px; color:#666;">Batch: ${c.batch_number}</span></td>
          <td>${c.qty} ${c.item_master.uom}</td>
          <td>${c.item_master.mrp}</td>
          <td>${amount.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // 🚀 Cleaned up PDF Document: Removed Tax Tables completely
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Helvetica, sans-serif; color: #000; font-size: 12px; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; color: #16A34A; }
          .header p { margin: 2px 0; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 6px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .text-right { text-align: right; }
          .grid { display: flex; justify-content: space-between; margin-bottom: 15px; border: 1px solid #000; padding: 10px; }
          .box { width: 48%; }
          .box h3 { margin: 0 0 5px 0; font-size: 14px; text-decoration: underline; }
          .title-bar { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; border: 1px solid #000; background: #e2e8f0; padding: 5px; }
          .totals { margin-top: -15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Gujarat Life Sciences Pvt Ltd.</h1>
          <p>9, Krishna Industrial Estate, Gorwa, Vadodara. | Ph: 0265-2285611</p>
        </div>

        <div class="grid">
          <div class="box">
            <h3>Buyer Details</h3>
            <strong>${farmerName}</strong><br>
            ${address}<br>
            Mobile: ${mobile}<br>
            State Name: Gujarat
          </div>
          <div class="box">
            <h3>Invoice Details</h3>
            <strong>Invoice No:</strong> ${invoiceNo}<br>
            <strong>Date:</strong> ${dateStr}<br>
            <strong>Payment Mode:</strong> ${paymentMode}
          </div>
        </div>

        <div class="title-bar">RETAIL INVOICE</div>

        <table>
          <thead>
            <tr>
              <th>Sr No.</th>
              <th>Description of Goods</th>
              <th>Quantity</th>
              <th>MRP (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <table class="totals">
          <tr><td class="text-right"><strong>Grand Total</strong></td><td class="text-right w-[100px]"><strong>₹${grandTotal.toFixed(2)}</strong></td></tr>
        </table>

        <div style="text-align: center; margin-top: 10px;">
          <p>This is a Computer Generated Invoice.</p>
        </div>

        <p style="margin-top: 40px;"><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
        
      </body>
      </html>
    `;
  };

  const handleSubmit = async () => {
    if (!farmerName) return useAlertStore.getState().showAlert(t('Error'), t('Please enter a valid farmer name.'));
    if (cart.length === 0) return useAlertStore.getState().showAlert(t('Error'), t('Cart is empty.'));
    if (paymentMode === 'UPI' && !proofImage) return useAlertStore.getState().showAlert(t('Error'), t('UPI Payment screenshot is required.'));

    setIsSubmitting(true);
    try {
      let proofUrl = null;
      if (proofImage) proofUrl = await uploadFileToCloudinary(proofImage, 'image');

      const { data: orderData, error: orderError } = await supabase.from('retail_orders').insert({
        se_id: user?.id,
        farmer_mobile: mobile,
        farmer_name: farmerName,
        total_amount: grandTotal,
        payment_mode: paymentMode,
        payment_proof_url: proofUrl
      }).select('id, invoice_no, created_at').single();

      if (orderError) throw orderError;

      // 🚀 Store batch_number and calculate pure MRP
      const orderItems = cart.map(c => ({
        order_id: orderData.id,
        item_id: c.item_id,
        batch_number: c.batch_number,
        qty: c.qty,
        unit_price: c.item_master.mrp,
        total_price: c.item_master.mrp * c.qty
      }));
      await supabase.from('retail_order_items').insert(orderItems);

      const dateStr = new Date(orderData.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const html = generatePDFHTML(orderData.invoice_no, dateStr);
      const { uri } = await Print.printToFileAsync({ html });
      
      const pdfUrl = await uploadFileToCloudinary(uri, 'raw');
      await supabase.from('retail_orders').update({ pdf_url: pdfUrl }).eq('id', orderData.id);

      useAlertStore.getState().showAlert(t('Success'), t(`Invoice ${orderData.invoice_no} generated successfully!`));
      navigation.goBack();
    } catch (e: any) {
      useAlertStore.getState().showAlert(t('Transaction Failed'), e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 Logic for filtering search results
  const filteredInventory = inventory.filter(item => 
    item.item_master?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    item.batch_number?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // 🚀 Reusable Component for Product Rows
  const renderProductRow = (item: any, isSelectedView = false) => {
    const qtyInCart = cart.find(c => c.item_id === item.item_id && c.batch_number === item.batch_number)?.qty || 0;
    
    // Hide item from Search Dropdown if we are completely out of stock and it's not in the cart
    if (!isSelectedView && item.balance_qty === 0 && qtyInCart === 0) return null;

    return (
      <View key={`${item.item_id}-${item.batch_number}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isSelectedView ? '#FFF' : '#F1F5F9', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: qtyInCart > 0 ? colors.primary : colors.border, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{item.item_master.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>
            MRP: ₹{item.item_master.mrp} | Batch: {item.batch_number} | Stock: {item.balance_qty}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, padding: 2 }}>
          <Pressable onPress={() => removeFromCart(item.item_id, item.batch_number)} style={{ padding: 6 }} disabled={qtyInCart === 0}>
            <MaterialIcons name="remove" size={20} color={qtyInCart === 0 ? colors.textMuted : colors.danger} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '900', width: 30, textAlign: 'center' }}>{qtyInCart}</Text>
          <Pressable onPress={() => addToCart(item)} style={{ padding: 6 }} disabled={qtyInCart >= item.balance_qty}>
            <MaterialIcons name="add" size={20} color={qtyInCart >= item.balance_qty ? colors.textMuted : colors.primary} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}><MaterialIcons name="close" size={22} color={colors.text} /></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, flex: 1 }}>{t("New Invoice")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        
        {/* Buyer Details */}
        <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
          <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("1. Buyer Details")}</Text>
          
          <Input
            label={t("10-digit Mobile Number *")}
            placeholder={t("e.g. 9876543210")}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <View style={{ position: 'relative' }}>
            <Input
              label={t("Farmer Name *")}
              placeholder={t("Enter name or auto-fetch...")}
              value={farmerName}
              onChangeText={setFarmerName}
            />
            {searching && (
              <View style={{ position: 'absolute', right: 14, top: 40 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        {/* 🚀 New Smart Search & Product Selection */}
        <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '800', color: colors.primary }}>{t("2. Add Products")}</Text>
            {cart.length > 0 && (
               <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
                 <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>{cart.length} Selected</Text>
               </View>
            )}
          </View>

          {/* Search Bar Input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: radius.md, borderWidth: 1, borderColor: showProductList ? colors.primary : colors.border, paddingHorizontal: spacing.md, height: 44, marginBottom: spacing.sm }}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
            <TextInput
              placeholder={t("Search by product or batch...")}
              value={productSearch}
              onChangeText={setProductSearch}
              onFocus={() => setShowProductList(true)}
              style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text, height: '100%' }}
              placeholderTextColor={colors.textMuted}
            />
            {showProductList ? (
              <Pressable onPress={() => { setShowProductList(false); setProductSearch(''); }} style={{ padding: 4 }}>
                <MaterialIcons name="keyboard-arrow-up" size={24} color={colors.textMuted} />
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowProductList(true)} style={{ padding: 4 }}>
                <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Expanded List vs Selected Cart View */}
          {showProductList ? (
            <View style={{ maxHeight: 320, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' }}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 8, backgroundColor: '#F8FAFC' }}>
                {inventory.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', padding: 16 }}>{t("No stock available to sell.")}</Text>
                ) : filteredInventory.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', padding: 16 }}>{t("No matching products found.")}</Text>
                ) : (
                  filteredInventory.map((item) => renderProductRow(item, false))
                )}
              </ScrollView>
            </View>
          ) : (
            <View>
              {cart.length === 0 ? (
                <Pressable onPress={() => setShowProductList(true)} style={{ padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}>
                  <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>Tap search to browse and select products.</Text>
                </Pressable>
              ) : (
                <View style={{ marginTop: 4 }}>
                  {cart.map((item) => renderProductRow(item, true))}
                </View>
              )}
            </View>
          )}

        </View>

        {/* Summary & Payment */}
        {cart.length > 0 && (
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
            <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("3. Checkout & Payment")}</Text>
            
            <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg }}>
              {cart.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>
                      {c.item_master.name} <Text style={{ color: colors.textMuted }}>(x{c.qty})</Text>
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>Batch: {c.batch_number}</Text>
                  </View>
                  <Text style={{ fontWeight: '800' }}>₹{c.item_master.mrp * c.qty}</Text>
                </View>
              ))}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#E2E8F0' }}>
                <Text style={{ fontWeight: '900', fontSize: 20, color: colors.primary }}>{t("Grand Total")}</Text>
                <Text style={{ fontWeight: '900', fontSize: 20, color: colors.primary }}>₹{grandTotal}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.md }}>
              <Pressable onPress={() => setPaymentMode('CASH')} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: paymentMode === 'CASH' ? colors.primarySoft : '#F8FAFC', borderWidth: 1, borderColor: paymentMode === 'CASH' ? colors.primary : colors.border, alignItems: 'center' }}>
                <MaterialIcons name="payments" size={24} color={paymentMode === 'CASH' ? colors.primary : colors.textMuted} style={{ marginBottom: 4 }} />
                <Text style={{ fontWeight: '800', color: paymentMode === 'CASH' ? colors.primary : colors.textMuted }}>{t("CASH")}</Text>
              </Pressable>
              <Pressable onPress={() => setPaymentMode('UPI')} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: paymentMode === 'UPI' ? '#ECFCCB' : '#F8FAFC', borderWidth: 1, borderColor: paymentMode === 'UPI' ? '#65A30D' : colors.border, alignItems: 'center' }}>
                <MaterialIcons name="qr-code-scanner" size={24} color={paymentMode === 'UPI' ? '#4D7C0F' : colors.textMuted} style={{ marginBottom: 4 }} />
                <Text style={{ fontWeight: '800', color: paymentMode === 'UPI' ? '#4D7C0F' : colors.textMuted }}>{t("COMPANY UPI")}</Text>
              </Pressable>
            </View>

            {paymentMode === 'UPI' && (
              <View style={{ alignItems: 'center', backgroundColor: '#F8FAFC', padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
                <Text style={{ fontWeight: '800', marginBottom: 4 }}>{t("Scan to Pay")}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 16, fontWeight: '600' }}>UPI ID: msgujaratlifesciencesprivatelimited.eazypay@icici</Text>
                
                <View style={{ padding: 10, backgroundColor: '#FFF', borderRadius: 12, ...shadows.soft, marginBottom: 20 }}>
                   <Image 
                     source={{ uri: 'https://res.cloudinary.com/doy36ujkf/image/upload/v1784701526/GLS_UPI_QR_ieoolf.jpg' }} 
                     style={{ width: 120, height: 120 }} 
                     resizeMode="contain"
                   />
                </View>
                
                <Pressable onPress={handleCaptureProof} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: proofImage ? '#DCFCE7' : '#FFF', padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: proofImage ? '#22C55E' : colors.primary, width: '100%', justifyContent: 'center', ...shadows.soft }}>
                  <MaterialIcons name={proofImage ? "check-circle" : "camera-alt"} size={22} color={proofImage ? "#166534" : colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: '800', color: proofImage ? "#166534" : colors.primary, fontSize: 15 }}>{proofImage ? t("Proof Attached") : t("Upload Payment Proof *")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button label={isSubmitting ? t("Generating Invoice...") : t(`Generate Bill (₹${grandTotal})`)} disabled={cart.length === 0 || isSubmitting} onPress={handleSubmit} />
      </View>
    </View>
  );
};