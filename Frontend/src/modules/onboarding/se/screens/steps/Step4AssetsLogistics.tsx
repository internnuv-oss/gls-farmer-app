import React from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, RadioGroup, DatePickerField, MultiSelectField } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';
import { useTranslation } from 'react-i18next';

export const Step4AssetsLogistics = ({ form }: { form: any }) => {
  const { control } = form;
  const { t } = useTranslation();

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Assets & Logistics")}</Text>
      
      <Controller control={control} name="vehicleType" render={({field}) => <RadioGroup label={t("Vehicle Type *")} options={['Two-Wheeler', 'Four-Wheeler']} value={field.value} onChange={field.onChange} error={form.formState.errors.vehicleType?.message} />} />
      
      <Controller control={control} name="vehicleNumber" render={({field}) => <Input label={t("Vehicle Number *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder={t("e.g. GJ01AB1234")} error={form.formState.errors.vehicleNumber?.message} />} />
      
      <Controller control={control} name="drivingLicenseNo" render={({field}) => <Input label={t("Driving License No *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder={t("e.g. MH04 20100012345")} error={form.formState.errors.drivingLicenseNo?.message} />} />
      
      <Controller control={control} name="dlExpiryDate" render={({field}) => <DatePickerField label={t("DL Expiry Date *")} value={field.value} onChange={field.onChange} minimumDate={new Date()} error={form.formState.errors.dlExpiryDate?.message} />} />
      
      {/* Schema says optional, so no star */}
      <Controller control={control} name="companyAssets" render={({field}) => <MultiSelectField label={t("Company Assets Issued")} options={['Laptop', 'Mobile Phone', 'SIM Card', 'Tablet', 'Data Card']} value={field.value || []} onChange={field.onChange} placeholder={t("Select assets")} />} />  
      
      <Controller control={control} name="fuelAllowance" render={({field}) => <Input label={t("Fuel Allowance Limit (Optional)")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" prefix="₹" suffix="/km" placeholder={t("3.5")} />} />
    </View>
  );
};