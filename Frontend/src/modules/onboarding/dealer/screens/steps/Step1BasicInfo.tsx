import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField, TextArea, YearPickerField } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { DealerOnboardingValues } from '../../schema';

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const INDIAN_BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", 
  "Punjab National Bank", "Bank of Baroda", "Bank of India", "Union Bank of India"
];

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  cities: string[]; talukas: string[]; villages: string[]; loadingLoc: boolean;
}

export const Step1BasicInfo = ({ form, cities, talukas, villages, loadingLoc }: Props) => {
  const { control, watch, setValue, getValues } = form;

  const firmType = watch('firmType');
  const isMultiAllowed = ['Proprietorship', 'Partnership'].includes(firmType);
  const owners = watch('owners') || [{ name: '' }];
  const banks = watch('bankAccounts') || [{ accountType: '', accountName: '', accountNumber: '', bankIfsc: '', bankName: '', bankBranch: '' }];

  // Auto-inject additional slots if Proprietorship/Partnership is selected
  React.useEffect(() => {
    const currentOwners = getValues('owners') || [{ name: '' }];
    const currentBanks = getValues('bankAccounts') || [{ accountType: '', accountName: '', accountNumber: '', bankIfsc: '', bankName: '', bankBranch: '' }];
    if (isMultiAllowed) {
      if (currentOwners.length === 1) setValue('owners', [...currentOwners, { name: '' }]);
      if (currentBanks.length === 1) setValue('bankAccounts', [...currentBanks, { accountType: '', accountName: '', accountNumber: '', bankIfsc: '', bankName: '', bankBranch: '' }]);
    } else {
      if (currentOwners.length > 1) setValue('owners', [currentOwners[0]]);
      if (currentBanks.length > 1) setValue('bankAccounts', [currentBanks[0]]);
    }
  }, [isMultiAllowed]);

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Basic Information</Text>
      
      <Controller control={control} name="shopName" render={({field}) => <Input label="Shop / Firm Name *" value={field.value} onChangeText={field.onChange} placeholder="e.g. Kisan Seva Kendra" error={form.formState.errors.shopName?.message} />} />
      
      {/* Primary Owner is labeled as Contact Person */}
      <Controller control={control} name="owners.0.name" render={({field}) => <Input label="Contact Person *" value={field.value} onChangeText={field.onChange} placeholder="e.g. Ramesh Patel" error={form.formState.errors.owners?.[0]?.name?.message} />} />
      
      <Controller control={control} name="contactMobile" render={({field}) => <Input label="Mobile Number *" value={field.value} onChangeText={field.onChange} prefix="+91" keyboardType="phone-pad" maxLength={10} placeholder="9876543210" error={form.formState.errors.contactMobile?.message} />} />
      <Controller control={control} name="landlineNumber" render={({field}) => <Input label="Landline Number (Optional)" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" placeholder="e.g. 0265-243210" error={form.formState.errors.landlineNumber?.message} />} />
      
      <Controller control={control} name="state" render={({field}) => (
        <SelectField label="State *" value={field.value ?? ''} options={INDIAN_STATES} searchable onChange={(val) => { field.onChange(val); setValue('city', ''); setValue('taluka', ''); setValue('village', ''); }} error={form.formState.errors.state?.message} />
      )} />

      <Controller control={control} name="city" render={({field}) => (
        <SelectField label={loadingLoc ? "City/District (Loading...) *" : "City/District *"} value={field.value ?? ''} options={cities} searchable onChange={(val) => { field.onChange(val); setValue('taluka', ''); setValue('village', ''); }} error={form.formState.errors.city?.message} />
      )} />

      <Controller control={control} name="taluka" render={({field}) => (
        <SelectField label="Taluka/Tehsil *" value={field.value ?? ''} options={talukas} searchable onChange={(val) => { field.onChange(val); setValue('village', ''); }} error={form.formState.errors.taluka?.message} />
      )} />

      <Controller control={control} name="village" render={({field}) => (
        <SelectField label="Village *" value={field.value ?? ''} options={villages} searchable onChange={field.onChange} error={form.formState.errors.village?.message} />
      )} />

      <Controller control={control} name="address" render={({field}) => <TextArea label="Shop Address *" value={field.value} onChangeText={field.onChange} placeholder="Full postal address" error={form.formState.errors.address?.message} />} />
      <Controller control={control} name="landmark" render={({field}) => <Input label="Landmark (Optional)" value={field.value} onChangeText={field.onChange} />} />
      
      <Controller control={control} name="gstNumber" render={({field}) => <Input label="GST Number *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="eg. 22AAAAA0000A1Z5" maxLength={15} error={form.formState.errors.gstNumber?.message} />} />
      <Controller control={control} name="panNumber" render={({field}) => <Input label="PAN Number *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="eg. ABCDE1234F" maxLength={10} error={form.formState.errors.panNumber?.message} />} />
      <Controller control={control} name="estYear" render={({field}) => <YearPickerField label="Establishment Year *" value={field.value ?? ''} onChange={field.onChange} placeholder="Select Year" error={form.formState.errors.estYear?.message} />} />
      <Controller control={control} name="firmType" render={({field}) => <SelectField label="Type of Firm *" value={field.value ?? ''} options={['Proprietorship', 'Partnership', 'Pvt Ltd']} onChange={field.onChange} error={form.formState.errors.firmType?.message} />} />

      {/* --- CONDITIONAL ADDITIONAL OWNERS --- */}
{isMultiAllowed && (
  <View style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
    {owners.length > 1 && (
      <View>
        <Text style={{ fontWeight: '800', color: colors.textMuted, marginBottom: spacing.sm }}>
          Additional Owners / Partners
        </Text>
        {owners.slice(1).map((owner, idx) => {
          const actualIndex = idx + 1;
          return (
            <View key={actualIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name={`owners.${actualIndex}.name`}
                  render={({ field }) => (
                    <Input
                      label={`Name ${actualIndex + 1} *`}
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="e.g. Ramesh Patel"
                      error={form.formState.errors.owners?.[actualIndex]?.name?.message}
                    />
                  )}
                />
              </View>
              {/* REMOVE delete icon for the first additional name (actualIndex 1) */}
              {actualIndex > 1 && (
                <Pressable
                  onPress={() => setValue('owners', owners.filter((_, i) => i !== actualIndex))}
                  style={{
                    padding: 12,
                    backgroundColor: '#FEE2E2',
                    borderRadius: radius.md,
                    marginBottom: 8,
                  }}
                >
                  <MaterialIcons name="delete" size={20} color={colors.danger} />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    )}
    <Pressable
      onPress={() => setValue('owners', [...owners, { name: '' }])}
      style={{
        padding: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        borderRadius: radius.md,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add Another Owner/Partner</Text>
    </Pressable>
  </View>
)}

      {/* --- PRIMARY BANK DETAILS --- */}
      <Text style={{ fontSize: 16, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.md }}>Bank Details</Text>
      <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>Primary Account</Text>
        <Controller control={control} name="bankAccounts.0.accountType" render={({field}) => <SelectField label="Account Type *" value={field.value ?? ''} options={['Savings', 'Current', 'Overdraft', 'Cash Credit (CC)']} onChange={field.onChange} error={form.formState.errors.bankAccounts?.[0]?.accountType?.message} />} />
        <Controller control={control} name="bankAccounts.0.bankName" render={({field}) => <SelectField label="Bank Name *" value={field.value ?? ''} options={INDIAN_BANKS.sort()} searchable onChange={field.onChange} error={form.formState.errors.bankAccounts?.[0]?.bankName?.message} />} />
        <Controller control={control} name="bankAccounts.0.bankBranch" render={({field}) => <Input label="Branch Name *" value={field.value} onChangeText={field.onChange} placeholder="e.g. MG Road Branch" error={form.formState.errors.bankAccounts?.[0]?.bankBranch?.message} />} />
        <Controller control={control} name="bankAccounts.0.accountName" render={({field}) => <Input label="Account Name *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.bankAccounts?.[0]?.accountName?.message} />} />
        <Controller control={control} name="bankAccounts.0.accountNumber" render={({field}) => <Input label="Account Number *" value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={18} placeholder="Enter exact account no." error={form.formState.errors.bankAccounts?.[0]?.accountNumber?.message} />} />
        <Controller control={control} name="bankAccounts.0.bankIfsc" render={({field}) => <Input label="IFS Code *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="e.g. HDFC0001234" maxLength={11} error={form.formState.errors.bankAccounts?.[0]?.bankIfsc?.message} />} />
      </View>

      {/* --- CONDITIONAL ADDITIONAL BANKS --- */}
      {isMultiAllowed && (
        <View style={{ marginTop: spacing.sm }}>
          {banks.length > 1 && (
            <View>
              <Text style={{ fontWeight: '800', color: colors.textMuted, marginBottom: spacing.sm }}>Additional Bank Accounts</Text>
              {banks.slice(1).map((bank, idx) => {
                const actualIndex = idx + 1;
                return (
                  <View key={actualIndex} style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                      <Text style={{ fontWeight: '700', color: colors.text }}>Account {actualIndex + 1}</Text>
                      <Pressable onPress={() => setValue('bankAccounts', banks.filter((_, i) => i !== actualIndex))}>
                        <MaterialIcons name="close" size={20} color={colors.danger} />
                      </Pressable>
                    </View>

                    <Controller control={control} name={`bankAccounts.${actualIndex}.accountType`} render={({field}) => <SelectField label="Account Type *" value={field.value ?? ''} options={['Savings', 'Current', 'Overdraft', 'Cash Credit (CC)']} onChange={field.onChange} error={form.formState.errors.bankAccounts?.[actualIndex]?.accountType?.message} />} />
                    <Controller control={control} name={`bankAccounts.${actualIndex}.bankName`} render={({field}) => <SelectField label="Bank Name *" value={field.value ?? ''} options={INDIAN_BANKS.sort()} searchable onChange={field.onChange} error={form.formState.errors.bankAccounts?.[actualIndex]?.bankName?.message} />} />
                    <Controller control={control} name={`bankAccounts.${actualIndex}.bankBranch`} render={({field}) => <Input label="Branch Name *" value={field.value} onChangeText={field.onChange} placeholder="e.g. MG Road Branch" error={form.formState.errors.bankAccounts?.[actualIndex]?.bankBranch?.message} />} />
                    <Controller control={control} name={`bankAccounts.${actualIndex}.accountName`} render={({field}) => <Input label="Account Name *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.bankAccounts?.[actualIndex]?.accountName?.message} />} />
                    <Controller control={control} name={`bankAccounts.${actualIndex}.accountNumber`} render={({field}) => <Input label="Account Number *" value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={18} placeholder="Enter exact account no." error={form.formState.errors.bankAccounts?.[actualIndex]?.accountNumber?.message} />} />
                    <Controller control={control} name={`bankAccounts.${actualIndex}.bankIfsc`} render={({field}) => <Input label="IFS Code *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="e.g. HDFC0001234" maxLength={11} error={form.formState.errors.bankAccounts?.[actualIndex]?.bankIfsc?.message} />} />
                  </View>
                );
              })}
            </View>
          )}
          <Pressable onPress={() => setValue('bankAccounts', [...banks, { accountType: '', accountName: '', accountNumber: '', bankIfsc: '', bankName: '', bankBranch: '' }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add Another Bank Account</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};