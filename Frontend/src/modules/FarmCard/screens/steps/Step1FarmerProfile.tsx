// src/modules/FarmCard/screens/steps/Step1FarmerProfile.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Input, SelectField } from '../../../../design-system/components';
import { spacing, colors, radius, shadows } from '../../../../design-system/tokens';
import { FarmCardValues } from '../../schema';

interface Props {
  form: UseFormReturn<FarmCardValues>;
  t: any;
}

export const Step1FarmerProfile = ({ form, t }: Props) => {
  const { control } = form;

  const EDUCATION_OPTIONS = ["Illiterate", "Primary", "Secondary", "Graduate"];
  const LABOUR_OPTIONS = ["Family", "Hired", "Both"];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Demographics & Socio-Economic")}</Text>

      {/* Baseline Identity (Inherited & Locked) */}
      <View 
        style={{ 
          backgroundColor: '#F8FAFC', 
          padding: spacing.md, 
          borderRadius: radius.lg, 
          borderWidth: 1, 
          borderColor: colors.border, 
          marginBottom: spacing.lg, 
          opacity: 0.7, 
          ...shadows.soft 
        }} 
        pointerEvents="none"
      >
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Baseline Identity (Locked)")}</Text>
        
        <Controller control={control} name="farmerName" render={({field}) => (
          <Input label={t("Farmer Name")} placeholder={t("e.g. Ramesh Patel")} value={field.value} onChangeText={field.onChange} />
        )} />
        
        <Controller control={control} name="mobileNumber" render={({field}) => (
          <Input label={t("Mobile Number")} placeholder="9876543210" value={field.value} onChangeText={field.onChange} prefix="+91" />
        )} />
        
        {/* 🚀 Independent Location Fields Pre-filled */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="state" render={({field}) => (
              <Input label={t("State")} placeholder={t("e.g. Gujarat")} value={field.value} onChangeText={field.onChange} />
            )} />
          </View>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="district" render={({field}) => (
              <Input label={t("District")} placeholder={t("e.g. Vadodara")} value={field.value} onChangeText={field.onChange} />
            )} />
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="taluka" render={({field}) => (
              <Input label={t("Taluka")} placeholder={t("e.g. Padra")} value={field.value} onChangeText={field.onChange} />
            )} />
          </View>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="village" render={({field}) => (
              <Input label={t("Village")} placeholder={t("e.g. Chokari")} value={field.value} onChangeText={field.onChange} />
            )} />
          </View>
        </View>
      </View>

      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Socio-Economic Profile")}</Text>
      
      <Controller control={control} name="primaryWhatsapp" render={({field}) => (
        <Input label={t("Primary/WhatsApp Number")} placeholder={t("Enter WhatsApp Number")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" />
      )} />

      <Controller control={control} name="educationLevel" render={({field}) => (
        <SelectField label={t("Education Level")} placeholder={t("Select Level")} value={field.value ?? ''} options={EDUCATION_OPTIONS} onChange={field.onChange} />
      )} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="farmingExperience" render={({field}) => (
            <Input label={t("Farming Exp")} placeholder="e.g. 15" suffix={t("Yrs")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" />
          )} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="familyMembers" render={({field}) => (
            <Input label={t("Family Members")} placeholder="e.g. 5" value={field.value} onChangeText={field.onChange} keyboardType="numeric" />
          )} />
        </View>
      </View>

      <Controller control={control} name="labourType" render={({field}) => (
        <SelectField label={t("Labour on Farm")} placeholder={t("Select Labour Type")} value={field.value ?? ''} options={LABOUR_OPTIONS} onChange={field.onChange} />
      )} />
    </View>
  );
};