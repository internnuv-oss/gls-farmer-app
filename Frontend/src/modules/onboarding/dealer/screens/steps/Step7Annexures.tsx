import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, TextArea, RadioGroup, CheckboxItem, MultiSelectField, SelectField, AudioRecorder, UploadTile } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { DealerOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  uploading: Record<string, boolean>;
  handleAudioUpload: (key: string, uri: string) => void;
  handleUpload: (key: string, type: 'camera' | 'doc') => void; // <-- NEW PROP
  WEST_INDIA_CROPS: string[]; DEMO_SUPPLIERS: string[]; DEMO_CHEMICALS: string[]; DEMO_BIOS: string[]; DEMO_OTHERS: string[];
  talukas: string[]; stateData: any; selectedCity: string;
}

export const Step7Annexures = ({ 
  form, uploading, handleAudioUpload, handleUpload, WEST_INDIA_CROPS, DEMO_SUPPLIERS, 
  DEMO_CHEMICALS, DEMO_BIOS, DEMO_OTHERS, talukas, stateData, selectedCity 
}: Props) => {
  const { control, watch, setValue } = form;
  const territories = watch('seTerritories') || [];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>SE Evaluation & Annexures</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Fill out the territory and business details to generate the final agreement.</Text>

      {/* ... [KEEP ANNEXURE A, B, D, E & F EXACTLY AS THEY WERE] ... */}
      
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Annexure A: Territory Coverage</Text>
        
        {territories.map((territory, index) => {
          const rowTaluka = watch(`seTerritories.${index}.taluka`);
          let rowVillages: string[] = [];
          
          if (stateData && selectedCity && rowTaluka) {
            const dist = stateData.districts?.find((d: any) => d.district === selectedCity);
            if (dist && dist.subDistricts) {
              const sub = dist.subDistricts.find((sd: any) => sd.subDistrict === rowTaluka);
              if (sub && sub.villages) {
                rowVillages = [...sub.villages].sort();
              }
            }
          }

          return (
            <View key={index} style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Territory {index + 1}</Text>
                {index > 0 && (
                  <Pressable onPress={() => { const newTerr = territories.filter((_, i) => i !== index); setValue('seTerritories', newTerr, {shouldValidate: true}); }}>
                    <MaterialIcons name="close" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </View>

              <Controller control={control} name={`seTerritories.${index}.taluka`} render={({field}) => (
                <SelectField label="Taluka *" value={field.value ?? ''} options={talukas.length > 0 ? talukas : ['Select City in Step 1 first']} searchable onChange={(val) => { field.onChange(val); setValue(`seTerritories.${index}.village`, []); }} error={form.formState.errors.seTerritories?.[index]?.taluka?.message} />
              )} />
              
              <Controller control={control} name={`seTerritories.${index}.village`} render={({field}) => (
                <MultiSelectField label="Village(s) *" value={field.value ?? []} options={rowVillages.length > 0 ? rowVillages : ['Select Taluka first']} searchable onChange={field.onChange} error={form.formState.errors.seTerritories?.[index]?.village?.message} />
              )} />

              <Controller control={control} name={`seTerritories.${index}.cultivableArea`} render={({field}) => <Input label="Cultivable Area (in Acres) *" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 1500" error={form.formState.errors.seTerritories?.[index]?.cultivableArea?.message} />} />
              <Controller control={control} name={`seTerritories.${index}.majorCrops`} render={({field}) => <MultiSelectField label="Major crops in territory *" value={field.value || []} options={WEST_INDIA_CROPS} onChange={field.onChange} searchable placeholder="Select crops" error={form.formState.errors.seTerritories?.[index]?.majorCrops?.message} />} />
            </View>
          );
        })}
        
        <Pressable onPress={() => setValue('seTerritories', [...territories, { taluka: '', village: [], cultivableArea: '', majorCrops: [] }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add Another Territory</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Annexure B: Principal Companies & Products</Text>
        <Controller control={control} name="sePrincipalSuppliers" render={({field}) => <MultiSelectField label="List of current principal suppliers *" value={field.value || []} options={DEMO_SUPPLIERS} onChange={field.onChange} searchable placeholder="Select suppliers" />} />
        <Controller control={control} name="seChemicalProducts" render={({field}) => <MultiSelectField label="Chemical products range *" value={field.value || []} options={DEMO_CHEMICALS} onChange={field.onChange} searchable placeholder="Select chemicals" />} />
        <Controller control={control} name="seBioProducts" render={({field}) => <MultiSelectField label="Biological / organic products range *" value={field.value || []} options={DEMO_BIOS} onChange={field.onChange} searchable placeholder="Select biologicals" />} />
        <Controller control={control} name="seOtherProducts" render={({field}) => <MultiSelectField label="Other products (seeds, etc.) *" value={field.value || []} options={DEMO_OTHERS} onChange={field.onChange} searchable placeholder="Select other products" />} />
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Annexure D: Bank & Credit References</Text>
        <Controller control={control} name="seHasCreditReferences" render={({field}) => (
          <RadioGroup label="Add supplier references? (Optional)" options={['Yes', 'No']} value={field.value} onChange={(val) => { field.onChange(val); if (val === 'No') setValue('seCreditReferences', []); else setValue('seCreditReferences', [{name: '', contact: '', behavior: '', behaviorAudio: ''}]); }} />
        )} />
        
        {watch('seHasCreditReferences') === 'Yes' && (
          <View style={{ marginTop: spacing.sm }}>
            {watch('seCreditReferences')?.map((ref, index) => (
              <View key={index} style={{ padding: spacing.sm, backgroundColor: '#F8FAFC', borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>Supplier Reference {index + 1}</Text>
                  {index > 0 && <Pressable onPress={() => { const newRefs = (watch('seCreditReferences') || []).filter((_, i) => i !== index); setValue('seCreditReferences', newRefs, {shouldValidate: true}); }}><MaterialIcons name="close" size={20} color={colors.danger} /></Pressable>}
                </View>
                <Input label="Supplier Name *" value={ref.name} placeholder="e.g. Ramesh Agro" onChangeText={(val) => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].name = val; setValue('seCreditReferences', refs, {shouldValidate: true}); }} />
                <Input label="Contact Number *" value={ref.contact} placeholder="9876543210" prefix="+91" maxLength={10} keyboardType="phone-pad" onChangeText={(val) => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].contact = val; setValue('seCreditReferences', refs, {shouldValidate: true}); }} />
                <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 4, marginTop: 8 }}>Last 12-month payment behavior (Optional)</Text>
                <TextArea label="Behavior Notes" placeholder="Type behavior here..." value={ref.behavior} onChangeText={(val) => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].behavior = val; setValue('seCreditReferences', refs, {shouldValidate: true}); }} />
                <Text style={{ textAlign: 'center', marginVertical: 4, color: colors.textMuted, fontWeight: '800' }}>OR</Text>
                <AudioRecorder value={ref.behaviorAudio} loading={uploading[`seCreditReferences.${index}.behaviorAudio`]} onRecord={(uri) => handleAudioUpload(`seCreditReferences.${index}.behaviorAudio`, uri)} onClear={() => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].behaviorAudio = ''; setValue('seCreditReferences', refs, {shouldValidate: true}); }} />
              </View>
            ))}
            <Pressable onPress={() => setValue('seCreditReferences', [...(watch('seCreditReferences') || []), {name: '', contact: '', behavior: '', behaviorAudio: ''}])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add Another Supplier</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Annexure E & F: Sales & Expansion</Text>
        <Controller control={control} name="seWillShareSales" render={({field}) => <CheckboxItem label="Dealer confirms they will share monthly GLS sales breakup (dealer-wise, crop-wise) (Optional)" checked={field.value || false} onChange={field.onChange} />} />
        <View style={{ marginTop: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 4 }}>Future Expansion Plan (2-year growth vision) (Optional)</Text>
          <Controller control={control} name="seGrowthVision" render={({field}) => <TextArea label="Vision Notes" placeholder="Type vision here..." value={field.value} onChangeText={field.onChange} />} />
          <Text style={{ textAlign: 'center', marginVertical: 8, color: colors.textMuted, fontWeight: '800' }}>OR</Text>
          <Controller control={control} name="seGrowthVisionAudio" render={({field}) => (
            <AudioRecorder value={field.value} loading={uploading['seGrowthVisionAudio']} onRecord={(uri) => handleAudioUpload('seGrowthVisionAudio', uri)} onClear={() => { field.onChange(''); setValue('seGrowthVisionAudio', ''); }} />
          )} />
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Section E: Terms & Conditions Variables</Text>
        <Controller control={control} name="seSecurityDeposit" render={({field}) => <Input label="Security Deposit Amount (If applicable)" prefix="₹" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="50000" />} />
      </View>

      {/* ---> NEW: CONDITIONAL PAYMENT PROOF SECTION <--- */}
      {watch('seSecurityDeposit') && parseInt(watch('seSecurityDeposit') || '0') > 0 && (
        <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.xs, color: colors.primary }}>Payment Proof *</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.md }}>Please provide either a Transaction ID/Cheque No. OR upload a media proof.</Text>
          
          <Controller 
            control={control} 
            name="sePaymentProofText" 
            render={({field}) => (
              <Input 
                label="Transaction ID or Cheque Number" 
                value={field.value} 
                onChangeText={field.onChange} 
                placeholder="e.g. TXN123456789 or CHQ000123" 
                error={form.formState.errors.sePaymentProofText?.message} 
              />
            )} 
          />
          
          <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 8, marginTop: spacing.sm, color: colors.text }}>Capture or Upload Media</Text>
          <UploadTile 
            value={watch('documents')?.['se_payment_proof']} 
            loading={uploading['se_payment_proof']} 
            onUpload={(src) => handleUpload('se_payment_proof', src)} 
            onClear={() => { 
              const d = {...watch('documents')}; 
              delete d['se_payment_proof']; 
              setValue('documents', d, {shouldValidate: true}); 
            }} 
          />
        </View>
      )}

    </View>
  );
};