import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, RadioGroup, SelectField, TextArea, YearPickerField, UploadTile } from '../../../../../design-system/components';
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

// Sub-component to handle independent GitHub fetching for EACH additional shop
const AdditionalShopLocation = ({ form, index }: { form: UseFormReturn<DealerOnboardingValues>, index: number }) => {
  const { control, watch, setValue } = form;

  const selectedState = watch(`additionalShops.${index}.state`);
  const selectedCity = watch(`additionalShops.${index}.city`);
  const selectedTaluka = watch(`additionalShops.${index}.taluka`);

  const [stateData, setStateData] = useState<any>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [talukas, setTalukas] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    if (!selectedState) { setStateData(null); setCities([]); return; }
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/internnuv-oss/indian-cities-and-villages/master/By%20States/${encodeURIComponent(selectedState)}.json`);
        if (!res.ok) throw new Error("State file not found.");
        setStateData(await res.json());
      } catch (e) {
        setCities([]); setStateData(null);
      } finally { setLoadingLoc(false); }
    };
    fetchStateData();
  }, [selectedState]);

  useEffect(() => {
    if (!stateData || !stateData.districts) return setCities([]);
    setCities(stateData.districts.map((d: any) => d.district).sort());
  }, [stateData]);

  useEffect(() => {
    if (!selectedCity || !stateData || !stateData.districts) return setTalukas([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedCity);
    if (dist && dist.subDistricts) setTalukas(dist.subDistricts.map((sd: any) => sd.subDistrict).sort());
    else setTalukas([]);
  }, [selectedCity, stateData]);

  useEffect(() => {
    if (!selectedTaluka || !selectedCity || !stateData || !stateData.districts) return setVillages([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedCity);
    if (dist && dist.subDistricts) {
      const sub = dist.subDistricts.find((sd: any) => sd.subDistrict === selectedTaluka);
      if (sub && sub.villages) setVillages([...sub.villages].sort());
      else setVillages([]);
    } else setVillages([]);
  }, [selectedTaluka, selectedCity, stateData]);

  return (
    <>
      <Controller control={control} name={`additionalShops.${index}.state`} render={({field}) => <SelectField label="State *" value={field.value ?? ''} options={INDIAN_STATES} searchable onChange={(val) => { field.onChange(val); setValue(`additionalShops.${index}.city`, ''); setValue(`additionalShops.${index}.taluka`, ''); setValue(`additionalShops.${index}.village`, ''); }} error={form.formState.errors.additionalShops?.[index]?.state?.message} />} />
      <Controller control={control} name={`additionalShops.${index}.city`} render={({field}) => <SelectField label={loadingLoc ? "City/District (Loading...) *" : "City/District *"} value={field.value ?? ''} options={cities} searchable onChange={(val) => { field.onChange(val); setValue(`additionalShops.${index}.taluka`, ''); setValue(`additionalShops.${index}.village`, ''); }} error={form.formState.errors.additionalShops?.[index]?.city?.message} />} />
      <Controller control={control} name={`additionalShops.${index}.taluka`} render={({field}) => <SelectField label="Taluka/Tehsil *" value={field.value ?? ''} options={talukas} searchable onChange={(val) => { field.onChange(val); setValue(`additionalShops.${index}.village`, ''); }} error={form.formState.errors.additionalShops?.[index]?.taluka?.message} />} />
      <Controller control={control} name={`additionalShops.${index}.village`} render={({field}) => <SelectField label="Village *" value={field.value ?? ''} options={villages} searchable onChange={field.onChange} error={form.formState.errors.additionalShops?.[index]?.village?.message} />} />
    </>
  );
};

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  uploading: Record<string, boolean>; handleUpload: (key: string, type: 'camera'|'doc') => void;
}

export const Step3Business = ({ form, uploading, handleUpload }: Props) => {
  const { control, watch, setValue } = form;

  const additionalShops = watch('additionalShops') || [];
  const godowns = watch('godowns') || [];
  const demoFarmers = watch('demoFarmers') || [];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Business Area & Status</Text>

      {/* FIXED: Removed firmType from the default values array here */}
      <Controller control={control} name="hasAdditionalLocations" render={({field}) => <RadioGroup label="Does the dealer have another shop or godown?" options={['Yes', 'No']} value={field.value} onChange={(val) => { field.onChange(val); if (val === 'No') { setValue('additionalShops', []); setValue('godowns', []); } else { setValue('additionalShops', [{ shopName: '', estYear: '', state: '', city: '', taluka: '', village: '', address: '' }]); setValue('godowns', [{ address: '', capacity: '', capacityUnit: 'Sq.ft' }]); } }} />} />

      {watch('hasAdditionalLocations') === 'Yes' && (
        <View style={{ marginBottom: spacing.xl, padding: spacing.md, backgroundColor: '#F8FAFC', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}>
          
          <Text style={{ fontWeight: '800', color: colors.textMuted, marginBottom: spacing.sm }}>Additional Shops</Text>
          {additionalShops.map((shop, i) => (
            <View key={i} style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Additional Shop {i + 1}</Text>
                <Pressable onPress={() => setValue('additionalShops', additionalShops.filter((_, index) => index !== i))}><MaterialIcons name="close" size={20} color={colors.danger} /></Pressable>
              </View>
              <Controller control={control} name={`additionalShops.${i}.shopName`} render={({field}) => <Input label="Shop Name *" value={field.value} onChangeText={field.onChange} placeholder="e.g. Kisan Seva Kendra" error={form.formState.errors.additionalShops?.[i]?.shopName?.message} />} />
              <Controller control={control} name={`additionalShops.${i}.estYear`} render={({field}) => <YearPickerField label="Establishment Year *" value={field.value ?? ''} onChange={field.onChange} placeholder="Select Year" error={form.formState.errors.additionalShops?.[i]?.estYear?.message} />} />
              
              {/* Uses the sub-component for independent cascading location logic */}
              <AdditionalShopLocation form={form} index={i} />
              
              <Controller control={control} name={`additionalShops.${i}.address`} render={({field}) => <TextArea label="Full Address *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.additionalShops?.[i]?.address?.message}/>} />
            </View>
          ))}
          <Pressable onPress={() => setValue('additionalShops', [...additionalShops, { shopName: '', estYear: '', state: '', city: '', taluka: '', village: '', address: '' }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.lg }}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add Another Shop</Text>
          </Pressable>

          <Text style={{ fontWeight: '800', color: colors.textMuted, marginBottom: spacing.sm }}>Godowns / Storage</Text>
          {godowns.map((godown, i) => (
            <View key={i} style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Godown {i + 1}</Text>
                <Pressable onPress={() => setValue('godowns', godowns.filter((_, index) => index !== i))}><MaterialIcons name="close" size={20} color={colors.danger} /></Pressable>
              </View>
              <Controller control={control} name={`godowns.${i}.address`} render={({field}) => <TextArea label="Full Address *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.godowns?.[i]?.address?.message}/>} />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 2 }}><Controller control={control} name={`godowns.${i}.capacity`} render={({field}) => <Input label="Capacity *" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 500" error={form.formState.errors.godowns?.[i]?.capacity?.message} />} /></View>
                <View style={{ flex: 1 }}><Controller control={control} name={`godowns.${i}.capacityUnit`} render={({field}) => <SelectField label="Unit *" value={field.value || 'Sq.ft'} options={['Sq.ft', 'Sq.m']} onChange={field.onChange} error={form.formState.errors.godowns?.[i]?.capacityUnit?.message} />} /></View>
              </View>
            </View>
          ))}
          <Pressable onPress={() => setValue('godowns', [...godowns, { address: '', capacity: '', capacityUnit: 'Sq.ft' }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add Godown</Text>
          </Pressable>
        </View>
      )}

      <Controller control={control} name="isLinkedToDistributor" render={({field}) => <RadioGroup label="Are you linked to any distributor? *" options={['Yes', 'No']} value={field.value} onChange={(val) => { field.onChange(val); if (val === 'No') setValue('linkedDistributors', []); else setValue('linkedDistributors', [{name: '', contact: ''}]); }} />} />
      {watch('isLinkedToDistributor') === 'Yes' && (
        <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
          <Input label="Distributor Name *" placeholder="e.g. Ramesh Agro" value={watch('linkedDistributors')?.[0]?.name || ''} onChangeText={(val) => { const current = watch('linkedDistributors')?.[0] || { name: '', contact: '' }; setValue('linkedDistributors', [{ name: val, contact: current.contact }], { shouldValidate: true }); }} />
          <Input label="Contact *" placeholder="9876543210" value={watch('linkedDistributors')?.[0]?.contact || ''} onChangeText={(val) => { const current = watch('linkedDistributors')?.[0] || { name: '', contact: '' }; setValue('linkedDistributors', [{ name: current.name, contact: val }], { shouldValidate: true }); }} keyboardType="phone-pad" maxLength={10} prefix="+91" />
        </View>
      )}

      <Controller control={control} name="proposedStatus" render={({field}) => <RadioGroup label="Proposed Status *" options={['Authorised Dealer', 'Exclusive Dealer', 'Dealer']} value={field.value} onChange={field.onChange} error={form.formState.errors.proposedStatus?.message} />} />
      
      <Controller control={control} name="willingDemoFarmers" render={({field}) => <RadioGroup label="Willing to work with 5–10 demo farmers per season? *" options={['Yes', 'No']} value={field.value} onChange={field.onChange} />} />
      
      {watch('willingDemoFarmers') === 'Yes' && (
        <View style={{ marginTop: spacing.md, marginBottom: spacing.xl }}>
          <Text style={{ fontWeight: '800', color: colors.text, marginBottom: spacing.sm }}>Demo Farmers List</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: spacing.md }}>Fill out details manually, or take a picture of their list.</Text>

          <UploadTile 
            value={watch('documents')?.['demo_farmers_list']} loading={uploading['demo_farmers_list']} 
            onUpload={(src) => handleUpload('demo_farmers_list', src)} 
            onClear={() => { const d = {...watch('documents')}; delete d['demo_farmers_list']; setValue('documents', d); }} 
          />

{!watch('documents')?.['demo_farmers_list'] && (
            <View style={{ marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' }}>
              {/* FIXED: Headers are now centered text */}
              <View style={{ flexDirection: 'row', backgroundColor: colors.primarySoft, padding: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ flex: 1.5, fontWeight: '700', fontSize: 12, color: colors.primary, textAlign: 'center' }}>Name</Text>
                <Text style={{ flex: 1.5, fontWeight: '700', fontSize: 12, color: colors.primary, textAlign: 'center' }}>Contact</Text>
                <Text style={{ flex: 2, fontWeight: '700', fontSize: 12, color: colors.primary, textAlign: 'center' }}>Address</Text>
              </View>
              {demoFarmers.map((farmer, i) => (
                <View key={i} style={{ flexDirection: 'row', borderBottomWidth: i === demoFarmers.length - 1 ? 0 : 1, borderBottomColor: colors.border, backgroundColor: '#FFF' }}>
                  <TextInput value={farmer.name} onChangeText={(val) => { const f = [...demoFarmers]; f[i].name = val; setValue('demoFarmers', f); }} style={{ flex: 1.5, padding: 8, fontSize: 13, borderRightWidth: 1, borderColor: colors.border }} />
                  
                  {/* ---> UPDATED: Wrapped in a row View with +91 prefix <--- */}
                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', borderRightWidth: 1, borderColor: colors.border, paddingHorizontal: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>+91 </Text>
                    <TextInput 
                      value={farmer.contact} 
                      onChangeText={(val) => { const f = [...demoFarmers]; f[i].contact = val; setValue('demoFarmers', f); }} 
                      keyboardType="phone-pad" 
                      maxLength={10}
                      style={{ flex: 1, paddingVertical: 8, fontSize: 13, color: colors.text }} 
                    />
                  </View>

                  <TextInput value={farmer.address} onChangeText={(val) => { const f = [...demoFarmers]; f[i].address = val; setValue('demoFarmers', f); }} style={{ flex: 2, padding: 8, fontSize: 13 }} />
                </View>
              ))}
            </View>
          )}
          {!watch('documents')?.['demo_farmers_list'] && (
            <Pressable onPress={() => setValue('demoFarmers', [...demoFarmers, { name: '', contact: '', address: '' }])} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>+ Add Row</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};