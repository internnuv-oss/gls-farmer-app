import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, TextArea, CheckboxItem, TagsInput, AudioRecorder, UploadTile, SelectField, MultiSelectField } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';
import { INDIAN_STATES } from './Step1BasicInfo';

const WEST_INDIA_CROPS = ["Cotton", "Groundnut", "Sugarcane", "Wheat", "Bajra", "Jowar", "Maize", "Castor", "Mustard", "Soybean", "Tur", "Chana", "Onion", "Potato", "Tomato", "Chilli"].sort();
const DEMO_CHEMICALS = ["Urea", "DAP", "MOP", "SSP", "Complex Fertilizers", "Herbicides", "Insecticides", "Fungicides"];
const DEMO_BIOS = ["Bio-Fertilizers", "Bio-Pesticides", "Mycorrhiza", "Seaweed Extract", "Amino Acids", "Humic Acid", "PGPR"];

// Sub-component for Independent Location Fetching per Region
const TerritoryInputRow = ({ form, index, onRemove, t }: any) => {
  const { control, watch, setValue } = form;

  const selectedState = watch(`anxTerritories.${index}.state`);
  const selectedDistrict = watch(`anxTerritories.${index}.district`);
  const selectedTaluka = watch(`anxTerritories.${index}.taluka`);

  const [stateData, setStateData] = useState<any>(null);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [talukasList, setTalukasList] = useState<string[]>([]);
  const [villagesList, setVillagesList] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    if (!selectedState) { setStateData(null); setDistrictsList([]); return; }
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/internnuv-oss/indian-cities-and-villages/master/By%20States/${encodeURIComponent(selectedState)}.json`);
        if (!res.ok) throw new Error("State file not found.");
        setStateData(await res.json());
      } catch (e) {
        setDistrictsList([]); setStateData(null);
      } finally { setLoadingLoc(false); }
    };
    fetchStateData();
  }, [selectedState]);

  useEffect(() => {
    if (!stateData || !stateData.districts) return setDistrictsList([]);
    setDistrictsList(stateData.districts.map((d: any) => d.district).sort());
  }, [stateData]);

  useEffect(() => {
    if (!selectedDistrict || !stateData || !stateData.districts) return setTalukasList([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedDistrict);
    if (dist && dist.subDistricts) setTalukasList(dist.subDistricts.map((sd: any) => sd.subDistrict).sort());
    else setTalukasList([]);
  }, [selectedDistrict, stateData]);

  useEffect(() => {
    if (!selectedTaluka || !selectedDistrict || !stateData || !stateData.districts) return setVillagesList([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedDistrict);
    if (dist && dist.subDistricts) {
      const sub = dist.subDistricts.find((sd: any) => sd.subDistrict === selectedTaluka);
      if (sub && sub.villages) setVillagesList([...sub.villages].sort());
      else setVillagesList([]);
    } else setVillagesList([]);
  }, [selectedTaluka, selectedDistrict, stateData]);

  return (
    <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ fontWeight: '700', color: colors.text }}>{t("Region")} {index + 1}</Text>
        {index > 0 ? (
          <Pressable onPress={onRemove} hitSlop={15}><MaterialIcons name="close" size={24} color={colors.danger} /></Pressable>
        ) : null}
      </View>

      <Controller control={control} name={`anxTerritories.${index}.state`} render={({field}) => (
        <SelectField label={t("State *")} value={field.value ?? ''} options={INDIAN_STATES} searchable onChange={(val) => { field.onChange(val); setValue(`anxTerritories.${index}.district`, ''); setValue(`anxTerritories.${index}.taluka`, ''); setValue(`anxTerritories.${index}.villages`, []); }} error={form.formState.errors.anxTerritories?.[index]?.state?.message} />
      )} />
      
      <Controller control={control} name={`anxTerritories.${index}.district`} render={({field}) => (
        <SelectField label={loadingLoc ? t("District (Loading...) *") : t("District *")} value={field.value ?? ''} options={districtsList} searchable onChange={(val) => { field.onChange(val); setValue(`anxTerritories.${index}.taluka`, ''); setValue(`anxTerritories.${index}.villages`, []); }} error={form.formState.errors.anxTerritories?.[index]?.district?.message} />
      )} />

      <Controller control={control} name={`anxTerritories.${index}.taluka`} render={({field}) => (
        <SelectField label={t("Taluka *")} value={field.value ?? ''} options={talukasList} searchable onChange={(val) => { field.onChange(val); setValue(`anxTerritories.${index}.villages`, []); }} error={form.formState.errors.anxTerritories?.[index]?.taluka?.message} />
      )} />

      <Controller control={control} name={`anxTerritories.${index}.villages`} render={({field}) => (
        <MultiSelectField label={t("Villages Covered *")} value={Array.isArray(field.value) ? field.value : []} options={villagesList.length > 0 ? villagesList : [t("Select Taluka first")]} searchable onChange={field.onChange} placeholder={t("Select multiple villages")} error={form.formState.errors.anxTerritories?.[index]?.villages?.message} />
      )} />

      <Controller control={control} name={`anxTerritories.${index}.cultivableArea`} render={({field}) => (
        <Input label={t("Total Cultivable Area (in Acres) *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder={t("e.g. 50000")} error={form.formState.errors.anxTerritories?.[index]?.cultivableArea?.message} />
      )} />

      <Controller control={control} name={`anxTerritories.${index}.majorCrops`} render={({field}) => (
        <MultiSelectField label={t("Major Crops *")} value={Array.isArray(field.value) ? field.value : []} options={WEST_INDIA_CROPS} searchable onChange={field.onChange} placeholder={t("Select crops")} error={form.formState.errors.anxTerritories?.[index]?.majorCrops?.message} />
      )} />
    </View>
  );
};

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  uploading: Record<string, boolean>;
  handleAudioUpload: (key: string, uri: string) => void;
  handleUpload: (key: string, type: 'camera' | 'doc') => void;
  setStep: (step: number) => void;
  t: any;
}

export const Step8Annexures = ({ form, uploading, handleAudioUpload, handleUpload, setStep, t }: Props) => {
  const { control, watch, setValue } = form;

  // Watch fields
  const rawTerritories = watch('anxTerritories');
  const territories = Array.isArray(rawTerritories) && rawTerritories.length > 0 ? rawTerritories : [{ state: '', district: '', taluka: '', villages: [], cultivableArea: '', majorCrops: [] }];
  
  const rawPrincipalSuppliers = watch('anxPrincipalSuppliers');
  const principalSuppliers = Array.isArray(rawPrincipalSuppliers) && rawPrincipalSuppliers.length > 0 ? rawPrincipalSuppliers : [{ name: '', share: '' }];
  
  const rawSupplierRefs = watch('anxSupplierRefs');
  const supplierRefs = Array.isArray(rawSupplierRefs) ? rawSupplierRefs : [];

  // Data from previous steps
  const rawDealers = watch('topDealers');
  const topDealers = (Array.isArray(rawDealers) ? rawDealers : []) as any[];
  const hasUploadedDealerList = !!watch('documents')?.['dealer_network_list'];

  const godownCapacity = watch('godownCapacity');
  const coldChainFacility = watch('coldChainFacility');

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("SE Evaluation & Annexures")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 }}>
        {t("Complete the formal annexures required for the distributor agreement.")}
      </Text>

      {/* --- ANNEXURE A: TERRITORY --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>{t("Annexure A: Territory Coverage")}</Text>
        
        {territories.map((_, index) => (
          <TerritoryInputRow key={index} form={form} index={index} t={t} onRemove={() => { const newTerr = territories.filter((_, i) => i !== index); setValue('anxTerritories', newTerr, {shouldValidate: true}); }} />
        ))}
        
        <Pressable onPress={() => setValue('anxTerritories', [...territories, { state: '', district: '', taluka: '', villages: [], cultivableArea: '', majorCrops: [] }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Region")}</Text>
        </Pressable>
      </View>

      {/* 🚀 NEW: ANNEXURE B (READ ONLY SUMMARY FROM STEP 4) WITH UPLOAD CHECK */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary }}>{t("Annexure B: Top Dealers")}</Text>
          <Pressable onPress={() => setStep(4)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 4 }}>{t("Edit")}</Text>
          </Pressable>
        </View>
        
        {hasUploadedDealerList ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: '#86EFAC' }}>
            <MaterialIcons name="check-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{t("Dealer List Document Uploaded")}</Text>
          </View>
        ) : topDealers.length > 0 ? (
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
              {t("{{count}} dealers recorded manually in Step 4.", { count: topDealers.length })}
            </Text>
            {topDealers.slice(0, 3).map((d: any, i: number) => (
              <Text key={i} style={{ color: colors.text, fontSize: 13, marginBottom: 4, fontWeight: '600' }}>
                • {d.name} <Text style={{ color: colors.textMuted }}>({d.contact || 'No Contact'})</Text>
              </Text>
            ))}
            {topDealers.length > 3 ? <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: '700' }}>+ {topDealers.length - 3} {t("more dealers...")}</Text> : null}
          </View>
        ) : (
          <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>{t("No dealers recorded. Please go back to Step 4.")}</Text>
        )}
      </View>

      {/* --- ANNEXURE C: PRINCIPAL COMPANIES --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.md, color: colors.primary }}>{t("Annexure C: Principal Companies & Products")}</Text>
        
        <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, fontSize: 12 }}>{t("Principal Suppliers & Share *")}</Text>
        
        {principalSuppliers.map((_, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.xs }}>
            <View style={{ flex: 2 }}>
              <Controller control={control} name={`anxPrincipalSuppliers.${index}.name`} render={({field}) => <Input label={index === 0 ? "Supplier Name *" : ""} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. UPL")} error={form.formState.errors.anxPrincipalSuppliers?.[index]?.name?.message} />} />
            </View>
            <View style={{ flex: 1 }}>
              <Controller control={control} name={`anxPrincipalSuppliers.${index}.share`} render={({field}) => <Input label={index === 0 ? "% Share *" : ""} value={field.value} onChangeText={field.onChange} keyboardType="numeric" suffix="%" placeholder="20" error={form.formState.errors.anxPrincipalSuppliers?.[index]?.share?.message} />} />
            </View>
            {index > 0 ? (
              <Pressable onPress={() => { const newSuppliers = principalSuppliers.filter((_, i) => i !== index); setValue('anxPrincipalSuppliers', newSuppliers, {shouldValidate: true}); }} hitSlop={15} style={{ padding: 4, marginTop: -16 }}>
                <MaterialIcons name="close" size={24} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
        ))}
        
        <Pressable onPress={() => setValue('anxPrincipalSuppliers', [...principalSuppliers, { name: '', share: '' }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Supplier")}</Text>
        </Pressable>

        <Controller control={control} name="anxChemicalProducts" render={({field}) => <MultiSelectField label={t("Chemical products range *")} value={Array.isArray(field.value) ? field.value : []} options={DEMO_CHEMICALS} searchable onChange={field.onChange} placeholder={t("Select chemicals")} error={form.formState.errors.anxChemicalProducts?.message} />} />
        <Controller control={control} name="anxBioProducts" render={({field}) => <MultiSelectField label={t("Biological / organic products range *")} value={Array.isArray(field.value) ? field.value : []} options={DEMO_BIOS} searchable onChange={field.onChange} placeholder={t("Select biologicals")} error={form.formState.errors.anxBioProducts?.message} />} />
        <Controller control={control} name="anxOtherProducts" render={({field}) => <TagsInput label={t("Other products (seeds, implements, etc.) *")} value={Array.isArray(field.value) ? field.value : []} onChange={field.onChange} placeholder={t("Type and press Enter")} error={form.formState.errors.anxOtherProducts?.message} />} />
      </View>

      {/* --- ANNEXURE D: INFRASTRUCTURE (READ ONLY) --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary }}>{t("Annexure D: Infrastructure")}</Text>
          <Pressable onPress={() => setStep(3)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 4 }}>{t("Edit")}</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.text, fontSize: 13, marginBottom: 4 }}>
          <Text style={{ fontWeight: '700', color: colors.textMuted }}>{t("Godown Capacity")}: </Text>{godownCapacity ? `${godownCapacity} Sq.ft` : t('N/A')}
        </Text>
        <Text style={{ color: colors.text, fontSize: 13 }}>
          <Text style={{ fontWeight: '700', color: colors.textMuted }}>{t("Cold Chain Facility")}: </Text>{coldChainFacility || t('N/A')}
        </Text>
      </View>

      {/* --- ANNEXURE E: CREDIT REFERENCES --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>{t("Annexure E: Bank & Credit References")}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm }}>{t("Provide 2-3 supplier references with last 12-month payment behaviour.")}</Text>
        
        {supplierRefs.map((ref, index) => (
          <View key={index} style={{ padding: spacing.sm, backgroundColor: '#F8FAFC', borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{t("Supplier Reference")} {index + 1}</Text>
              {index > 0 ? <Pressable onPress={() => { const newRefs = supplierRefs.filter((_, i) => i !== index); setValue('anxSupplierRefs', newRefs, {shouldValidate: true}); }} hitSlop={15}><MaterialIcons name="close" size={24} color={colors.danger} /></Pressable> : null}
            </View>
            <Input label={t("Supplier Name *")} value={ref.name} placeholder="e.g. ABC Agrochemicals" onChangeText={(val) => { const refs = [...supplierRefs]; refs[index].name = val; setValue('anxSupplierRefs', refs, {shouldValidate: true}); }} error={form.formState.errors.anxSupplierRefs?.[index]?.name?.message} />
            <Input label={t("Contact Number *")} value={ref.contact} placeholder="9876543210" prefix="+91" maxLength={10} keyboardType="phone-pad" onChangeText={(val) => { const refs = [...supplierRefs]; refs[index].contact = val; setValue('anxSupplierRefs', refs, {shouldValidate: true}); }} error={form.formState.errors.anxSupplierRefs?.[index]?.contact?.message} />
            
            <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 4, marginTop: 8 }}>{t("Payment Behavior")}</Text>
            <TextArea label={t("Behavior Notes")} placeholder={t("Type behavior here...")} value={ref.behavior} onChangeText={(val) => { const refs = [...supplierRefs]; refs[index].behavior = val; setValue('anxSupplierRefs', refs, {shouldValidate: true}); }} />
            <Text style={{ textAlign: 'center', marginVertical: 4, color: colors.textMuted, fontWeight: '800' }}>{t("OR")}</Text>
            <AudioRecorder value={ref.behaviorAudio} loading={uploading[`anxSupplierRefs.${index}.behaviorAudio`]} onRecord={(uri) => handleAudioUpload(`anxSupplierRefs.${index}.behaviorAudio`, uri)} onClear={() => { const refs = [...supplierRefs]; refs[index].behaviorAudio = ''; setValue('anxSupplierRefs', refs, {shouldValidate: true}); }} />
          </View>
        ))}
        <Pressable onPress={() => setValue('anxSupplierRefs', [...supplierRefs, {name: '', contact: '', behavior: '', behaviorAudio: ''}])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Supplier")}</Text>
        </Pressable>
      </View>

      {/* --- ANNEXURE F & G: SALES & VISION --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>{t("Annexure F & G: Sales & Vision")}</Text>
        <Controller control={control} name="anxWillShareSales" render={({field}) => <CheckboxItem label={t("Distributor confirms they will share monthly GLS sales breakup (dealer-wise, crop-wise)")} checked={field.value || false} onChange={field.onChange} />} />
        
        <View style={{ marginTop: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 4 }}>{t("Future Expansion Plan (2-year growth vision) *")}</Text>
          <Controller control={control} name="anxGrowthVision" render={({field}) => <TextArea label={t("Vision Notes")} placeholder={t("Type vision here...")} value={field.value} onChangeText={field.onChange} />} />
          <Text style={{ textAlign: 'center', marginVertical: 8, color: colors.textMuted, fontWeight: '800' }}>{t("OR")}</Text>
          <Controller control={control} name="anxGrowthVisionAudio" render={({field}) => (
            <AudioRecorder value={field.value} loading={uploading['anxGrowthVisionAudio']} onRecord={(uri) => handleAudioUpload('anxGrowthVisionAudio', uri)} onClear={() => { field.onChange(''); setValue('anxGrowthVisionAudio', ''); }} />
          )} />
        </View>
      </View>

      {/* --- TERMS & CONDITIONS VARIABLES --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>{t("Section E: Terms & Conditions Variables")}</Text>
        <Controller control={control} name="securityDeposit" render={({field}) => <Input label={t("Security Deposit Amount (If applicable)")} prefix="₹" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="500000" />} />
        
        {parseInt(watch('securityDeposit') || '0') > 0 ? (
          <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontWeight: '800', fontSize: 14, marginBottom: spacing.xs, color: colors.text }}>{t("Payment Proof *")}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.md }}>{t("Please provide either a Transaction ID/Cheque No. OR upload a media proof.")}</Text>
            
            <Controller control={control} name="paymentProofText" render={({field}) => (
                <Input label={t("Transaction ID or Cheque Number")} value={field.value} onChangeText={field.onChange} placeholder="e.g. TXN123456789 or CHQ000123" />
            )} />
            
            <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 8, marginTop: spacing.sm, color: colors.text }}>{t("Capture or Upload Media")}</Text>
            <UploadTile 
              value={watch('documents')?.['distributor_payment_proof']} 
              loading={uploading['distributor_payment_proof']} 
              onUpload={(src) => handleUpload('distributor_payment_proof', src)} 
              onClear={() => { const d = {...watch('documents')}; delete d['distributor_payment_proof']; setValue('documents', d, {shouldValidate: true}); }} 
            />
          </View>
        ) : null}
      </View>

    </View>
  );
};