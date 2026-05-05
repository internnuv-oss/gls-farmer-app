import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, RadioGroup, MultiSelectField } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  t: any;
}

// ---> NEW: Custom Input Component to keep the "X" inside the box and reduce gaps <---
const SupplierInputRow = ({ form, index, onRemove, t }: any) => {
  const { control } = form;
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: spacing.sm, width: '100%' }}>
      <Controller
        control={control}
        name={`currentSuppliers.${index}`}
        render={({ field }) => {
          const error = form.formState.errors.currentSuppliers?.[index]?.message;
          return (
            <View>
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderWidth: 1.5, borderColor: error ? colors.danger : isFocused ? colors.primary : colors.border,
                  borderRadius: radius.lg, backgroundColor: colors.surface, height: 56,
                  paddingHorizontal: spacing.md,
                  shadowColor: isFocused ? colors.primary : '#000', shadowOpacity: isFocused ? 0.1 : 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: isFocused ? 2 : 0
                }}
              >
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t("e.g. Bayer, Syngenta, UPL")}
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  style={{ flex: 1, height: '100%', color: colors.text, fontSize: 16, fontWeight: '600' }}
                />
                
                {/* The "X" button is now cleanly inside the input container */}
                {index > 0 && (
                  <Pressable onPress={onRemove} hitSlop={15} style={{ padding: 4, marginLeft: 8 }}>
                    <MaterialIcons name="close" size={22} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
              {error && <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error as string}</Text>}
            </View>
          );
        }}
      />
    </View>
  );
};

export const Step3Business = ({ form, t }: Props) => {
  const { control, watch, setValue } = form;

  // Watch the State from Step 1 to fetch relevant districts
  const selectedState = watch('state');
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  // Safely ensure currentSuppliers is an array
  const rawSuppliers = watch('currentSuppliers');
  const currentSuppliers = Array.isArray(rawSuppliers) ? rawSuppliers : [''];

  useEffect(() => {
    if (!selectedState) { setDistrictsList([]); return; }
    
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/internnuv-oss/indian-cities-and-villages/master/By%20States/${encodeURIComponent(selectedState)}.json`);
        if (!res.ok) throw new Error("State file not found.");
        const data = await res.json();
        if (data && data.districts) {
          setDistrictsList(data.districts.map((d: any) => d.district).sort());
        }
      } catch (e) {
        setDistrictsList([]); 
      } finally { 
        setLoadingLoc(false); 
      }
    };
    
    fetchStateData();
  }, [selectedState]);

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
        {t("Onboarding & Appointment Details")}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 }}>
        {t("Define the territory, business potential, and infrastructure availability.")}
      </Text>

      {/* --- BUSINESS POTENTIAL --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
          {t("Business Scope")}
        </Text>

        <Controller 
          control={control} 
          name="appliedTerritory" 
          render={({field}) => (
            <MultiSelectField 
              label={loadingLoc ? t("Applied Territory / Districts (Loading...) *") : t("Applied Territory / Districts *")} 
              value={Array.isArray(field.value) ? field.value : []} 
              options={districtsList.length > 0 ? districtsList : [t('Select State in Step 1 first')]} 
              searchable 
              onChange={field.onChange} 
              placeholder={t("Select multiple districts")} 
              error={form.formState.errors.appliedTerritory?.message} 
            />
          )} 
        />
        
        <Controller 
          control={control} 
          name="turnoverPotential" 
          render={({field}) => <Input label={t("Expected Seasonal Turnover Potential *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" prefix="₹" suffix="Cr" placeholder="e.g. 2.5" error={form.formState.errors.turnoverPotential?.message} />} 
        />

        <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, fontSize: 12 }}>{t("Current Major Suppliers *")}</Text>
        
        {/* Render our new custom sleek rows */}
        {currentSuppliers.map((supplier, index) => (
          <SupplierInputRow
            key={index}
            form={form}
            index={index}
            t={t}
            onRemove={() => {
              const updated = [...currentSuppliers];
              updated.splice(index, 1);
              setValue('currentSuppliers', updated, { shouldValidate: true });
            }}
          />
        ))}

        <Pressable 
          onPress={() => setValue('currentSuppliers', [...currentSuppliers, ''])} 
          style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginTop: 4, marginBottom: spacing.sm }}
        >
          <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Supplier")}</Text>
        </Pressable>
      </View>

      {/* --- GLS PARTNERSHIP TARGETS --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
          {t("Partnership Targets")}
        </Text>

        <Controller 
          control={control} 
          name="proposedStatus" 
          render={({field}) => <RadioGroup label={t("Proposed Status *")} options={['Authorised Distributor', 'Exclusive Focus Area']} value={field.value} onChange={field.onChange} error={form.formState.errors.proposedStatus?.message} />} 
        />

        <Controller 
          control={control} 
          name="demoFarmersCommitment" 
          render={({field}) => <Input label={t("Target: Dealers to be activated (with 5-10 demo farmers each) *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 25" error={form.formState.errors.demoFarmersCommitment?.message} />} 
        />
      </View>

      {/* --- INFRASTRUCTURE (From Annexure D) --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
          {t("Infrastructure Details")}
        </Text>

        <Controller 
          control={control} 
          name="godownCapacity" 
          render={({field}) => <Input label={t("Godown / Storage Capacity *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" suffix="Sq.ft" placeholder="e.g. 5000" error={form.formState.errors.godownCapacity?.message} />} 
        />

        <Controller 
          control={control} 
          name="coldChainFacility" 
          render={({field}) => <RadioGroup label={t("Cold-chain / temperature-controlled facility available? (Critical for microbial products) *")} options={['Yes', 'No']} value={field.value} onChange={field.onChange} error={form.formState.errors.coldChainFacility?.message} />} 
        />
      </View>

    </View>
  );
};