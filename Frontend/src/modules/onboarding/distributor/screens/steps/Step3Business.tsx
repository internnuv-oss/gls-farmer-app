import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, RadioGroup, MultiSelectField, SelectField } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';
import { supabase } from '../../../../../core/supabase';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  t: any;
}

const MAJOR_SUPPLIERS = [
  "Bayer", "Syngenta", "UPL", "Corteva", "FMC", "PI Industries", "Coromandel", "IFFCO", "Others"
];

const SupplierInputRow = ({ value, onChangeText, onRemove, error, t, showRemove }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.sm, width: '100%' }}>
      <View style={{
          flexDirection: 'row', alignItems: 'center',
          borderWidth: 1.5, borderColor: error ? colors.danger : isFocused ? colors.primary : colors.border,
          borderRadius: radius.lg, backgroundColor: colors.surface, height: 56,
          paddingHorizontal: spacing.md,
          shadowColor: isFocused ? colors.primary : '#000', shadowOpacity: isFocused ? 0.1 : 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: isFocused ? 2 : 0
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t("e.g. Local Brand A")}
          placeholderTextColor="#94A3B8"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ flex: 1, height: '100%', color: colors.text, fontSize: 16, fontWeight: '600' }}
        />
        {showRemove && (
          <Pressable onPress={onRemove} hitSlop={15} style={{ padding: 4, marginLeft: 8 }}>
            <MaterialIcons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error && <Text style={{ color: colors.danger, marginTop: 4, fontSize: 12, fontWeight: '600' }}>{error as string}</Text>}
    </View>
  );
};

export const Step3Business = ({ form, t }: Props) => {
  const { control, watch, setValue } = form;

  // Watch the State from Step 1 to fetch relevant districts
  const selectedState = watch('state');
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    if (!selectedState) { setDistrictsList([]); return; }
    
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        // 🚀 Fetch directly from Supabase RPC
        const { data, error } = await supabase.rpc('get_gujarat_location_tree');
        if (error || !data) throw new Error("Location data not found.");
        
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

  // --- Dynamic Supplier Logic ---
  const rawSuppliers = watch('currentSuppliers');
  const currentSuppliers = Array.isArray(rawSuppliers) 
    ? rawSuppliers.filter(s => typeof s === 'string' && s.trim() !== '') 
    : [];
  
  // 1. Separate major selections from custom typed selections 
  // (Also automatically strip 'Others' if it was accidentally saved in an old draft)
  const majorSelected = currentSuppliers.filter(s => MAJOR_SUPPLIERS.includes(s) && s !== 'Others');
  const customSelected = currentSuppliers.filter(s => !MAJOR_SUPPLIERS.includes(s));

  // 2. Determine if "Others" logic should be active
  const isOthersSelected = customSelected.length > 0;

  // 3. The exact value to bind to the MultiSelectField UI
  const multiSelectValue = isOthersSelected ? [...majorSelected, 'Others'] : majorSelected;

  // 4. The exact inputs to render for "Other" suppliers
  const displayedCustom = isOthersSelected ? customSelected : [];

  const handleMajorChange = (newMajor: string[]) => {
    if (!newMajor.includes('Others')) {
      // "Others" deselected -> wipe custom inputs
      setValue('currentSuppliers', newMajor.filter(s => s !== 'Others'), { shouldValidate: true });
    } else {
      // "Others" selected -> keep existing custom, or add an empty string box if none exists
      const toKeep = displayedCustom.length > 0 ? displayedCustom : [''];
      // 🚀 CRITICAL FIX: Strip 'Others' before saving to the actual form state
      const cleanMajor = newMajor.filter(s => s !== 'Others');
      setValue('currentSuppliers', [...cleanMajor, ...toKeep], { shouldValidate: true });
    }
  };

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
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 2 }}>
            <Controller 
              control={control} 
              name="turnoverPotential" 
              render={({field}) => (
                <Input 
                  label={t("Seasonal Turnover Potential *")} 
                  value={field.value} 
                  onChangeText={field.onChange} 
                  keyboardType="numeric" 
                  prefix="₹" 
                  placeholder="e.g. 2.5" 
                  error={form.formState.errors.turnoverPotential?.message} 
                />
              )} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller 
              control={control} 
              name="turnoverPotentialUnit" 
              render={({field}) => (
                <SelectField 
                  label={t("Unit")} 
                  options={['Lacs', 'Cr']} 
                  value={field.value || 'Cr'} 
                  onChange={field.onChange} 
                />
              )} 
            />
          </View>
        </View>

        <Controller 
          control={control} 
          name="currentSuppliers" 
          render={() => {
            const errObj: any = form.formState.errors.currentSuppliers;
            const mainErrMsg = errObj?.message || (errObj && !Array.isArray(errObj) ? errObj.message : undefined);

            return (
              <MultiSelectField 
                label={t("Current Major Suppliers *")} 
                options={MAJOR_SUPPLIERS} 
                value={multiSelectValue} 
                onChange={handleMajorChange} 
                searchable
                placeholder={t("Select multiple suppliers")}
                error={mainErrMsg} 
              />
            );
          }} 
        />

        {/* --- CONDITIONAL CUSTOM SUPPLIER INPUTS --- */}
        {isOthersSelected && (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, fontSize: 12 }}>
              {t("Specify Other Suppliers *")}
            </Text>
            
            {displayedCustom.map((val, index) => {
              const errIndex = majorSelected.length + index;
              const errObj: any = form.formState.errors.currentSuppliers;
              const errorMsg = Array.isArray(errObj) ? errObj[errIndex]?.message : undefined;

              return (
                <SupplierInputRow 
                  key={index}
                  value={val}
                  t={t}
                  error={errorMsg}
                  showRemove={displayedCustom.length > 1}
                  onChangeText={(text: string) => {
                    const updated = [...displayedCustom];
                    updated[index] = text;
                    // 🚀 Merging ONLY clean major selected and custom inputs
                    setValue('currentSuppliers', [...majorSelected, ...updated], { shouldValidate: true });
                  }}
                  onRemove={() => {
                    const updated = [...displayedCustom];
                    updated.splice(index, 1);
                    // If the user deletes the last input, collapse the "Others" section
                    if (updated.length === 0) {
                      setValue('currentSuppliers', majorSelected, { shouldValidate: true });
                    } else {
                      setValue('currentSuppliers', [...majorSelected, ...updated], { shouldValidate: true });
                    }
                  }}
                />
              );
            })}

            <Pressable 
              onPress={() => setValue('currentSuppliers', [...majorSelected, ...displayedCustom, ''], { shouldValidate: true })} 
              style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginTop: 4, marginBottom: spacing.sm }}
            >
              <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Supplier")}</Text>
            </Pressable>
          </View>
        )}
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