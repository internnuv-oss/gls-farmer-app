import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../se/schema';

interface Step6Props {
  form: UseFormReturn<SEOnboardingValues>;
  renderEditBtn: (step: number) => React.ReactNode;
}

export const Step6Review = ({ form, renderEditBtn }: Step6Props) => {
  const { watch } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Final Review</Text>

      {/* 1. Personal Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>1. Personal Details</Text>
           {renderEditBtn(1)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Name: <Text style={{ color: colors.text }}>{watch('firstName')} {watch('lastName')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>DOB: <Text style={{ color: colors.text }}>{watch('dob')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Marital Status: <Text style={{ color: colors.text }}>{watch('maritalStatus')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Mobile: <Text style={{ color: colors.text }}>{watch('mobileNumber')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Email: <Text style={{ color: colors.text }}>{watch('emailId')}</Text></Text>
      </View>

      {/* 2. Organization */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>2. Organization</Text>
           {renderEditBtn(2)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Emp ID: <Text style={{ color: colors.text }}>{watch('employeeId')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Designation: <Text style={{ color: colors.text }}>{watch('designation')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Area/Territory: <Text style={{ color: colors.text }}>{watch('area')} ({watch('territory')})</Text></Text>
      </View>

      {/* 3 & 4. Financial & Assets */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>3 & 4. Fin & Assets</Text>
           {renderEditBtn(3)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>PAN: <Text style={{ color: colors.text }}>{watch('panNumber')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Bank A/c: <Text style={{ color: colors.text }}>{watch('bankAccountNumber')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Vehicle: <Text style={{ color: colors.text }}>{watch('vehicleType')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Assets: <Text style={{ color: colors.text }}>{watch('companyAssets')?.join(', ') || 'None'}</Text></Text>
      </View>

      {/* 5. Documents */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>5. Documents</Text>
           {renderEditBtn(5)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Profile Photo: <Text style={{ color: watch('documents')?.profilePhoto ? colors.primary : colors.danger, fontWeight: '700' }}>{watch('documents')?.profilePhoto ? 'Uploaded' : 'Missing'}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>ID Proof: <Text style={{ color: watch('documents')?.identityProof ? colors.primary : colors.danger, fontWeight: '700' }}>{watch('documents')?.identityProof ? 'Uploaded' : 'Missing'}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Address Proof: <Text style={{ color: watch('documents')?.addressProof ? colors.primary : colors.danger, fontWeight: '700' }}>{watch('documents')?.addressProof ? 'Uploaded' : 'Missing'}</Text></Text>
      </View>
    </View>
  );
};