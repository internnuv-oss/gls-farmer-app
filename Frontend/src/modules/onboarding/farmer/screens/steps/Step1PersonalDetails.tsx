import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';

export const Step1PersonalDetails = ({ control, errors, t, watch, uploading, handleUpload }: any) => {
  const profilePhoto = watch('profilePhoto');

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Personal Details")}</Text>

      {/* 🚀 Profile Photo Capture */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Pressable 
          onPress={() => handleUpload('profilePhoto')}
          style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: profilePhoto ? colors.success : colors.border, overflow: 'hidden', ...shadows.soft }}
        >
          {uploading?.['profilePhoto'] ? (
            <ActivityIndicator color={colors.primary} />
          ) : profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <MaterialIcons name="camera-alt" size={32} color={colors.textMuted} />
          )}
        </Pressable>
        <Text style={{ color: colors.primary, fontWeight: '700', marginTop: spacing.sm }}>
          {profilePhoto ? t("Tap to Retake Photo") : t("Capture Profile Photo")}
        </Text>
      </View>

      <Controller control={control} name="fullName" render={({field}) => <Input label={t("Farmer Full Name *")} value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />} />
      <Controller control={control} name="fatherName" render={({field}) => <Input label={t("Father/Husband Name *")} value={field.value} onChangeText={field.onChange} error={errors.fatherName?.message} />} />
      <Controller control={control} name="mobile" render={({field}) => <Input label={t("Mobile Number *")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" error={errors.mobile?.message} />} />
      <Controller control={control} name="alternateMobile" render={({field}) => <Input label={t("Alternate Mobile Number")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" />} />
      
      {/* 🚀 Reverted State and City back to Input */}
      <Controller control={control} name="state" render={({field}) => <Input label={t("State *")} value={field.value} onChangeText={field.onChange} error={errors.state?.message} />} />
      <Controller control={control} name="city" render={({field}) => <Input label={t("District *")} value={field.value} onChangeText={field.onChange} error={errors.city?.message} />} />
      <Controller control={control} name="taluka" render={({field}) => <Input label={t("Taluka *")} value={field.value} onChangeText={field.onChange} error={errors.taluka?.message} />} />
      <Controller control={control} name="village" render={({field}) => <Input label={t("Village *")} value={field.value} onChangeText={field.onChange} error={errors.village?.message} />} />
      
      {/* 🚀 ADDED BACK IN: The optional 6-digit Pincode */}
      <Controller control={control} name="pincode" render={({field}) => <Input label={t("Pincode")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={6} error={errors.pincode?.message} />} />
    </View>
  );
};