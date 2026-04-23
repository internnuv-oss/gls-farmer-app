import React, { useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView ,BackHandler} from 'react-native';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../design-system/templates';
import { Button, Input, SelectField, SignaturePad, ScoreSlider, UploadTile, UploadedFileCard, YearPickerField } from '../../../design-system/components';
import { TextArea } from '../../../design-system/components/TextArea';
import { RadioGroup } from '../../../design-system/components/RadioGroup';
import { TagsInput } from '../../../design-system/components/TagsInput';
import { CheckboxItem } from '../../../design-system/components/CheckboxItem';
import { MultiSelectField } from '../../../design-system/components/MultiSelectField';
import { AudioRecorder } from '../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useDealerOnboarding } from '../hooks';
import { GLS_COMMITMENTS } from '../schema';


const COMPLIANCE_ITEMS = ["Valid FCO Authorization / Fertilizer Dealer Registration", "Valid Insecticide Selling License", "Educational Qualification Certificate", "Any state-specific approvals"];

const SCORING_ASPECTS = [
  { key: 'scoreFinancial', rem: 'remFinancial', aud: 'audioFinancial', label: 'Financial Health & Turnover', params: 'Annual turnover, payment discipline with suppliers' },
  { key: 'scoreReputation', rem: 'remReputation', aud: 'audioReputation', label: 'Market Reputation', params: 'Feedback from local farmers & neighbouring dealers' },
  { key: 'scoreOperations', rem: 'remOperations', aud: 'audioOperations', label: 'Shop Operations & Infrastructure', params: 'Shop visibility, storage space & condition, display area, hygiene' },
  { key: 'scoreFarmerNetwork', rem: 'remFarmerNetwork', aud: 'audioFarmerNetwork', label: 'Farmer Network & Reach', params: 'No. of regular farmer customers (target 50–200+), villages covered, loyalty' },
  { key: 'scoreTeam', rem: 'remTeam', aud: 'audioTeam', label: 'Team & Professionalism', params: 'Owner involvement, staff quality, willingness to undergo training' },
  { key: 'scorePortfolio', rem: 'remPortfolio', aud: 'audioPortfolio', label: 'Current Portfolio', params: 'Products currently sold (chemicals, seeds, bio), % bio sales if any' },
  { key: 'scoreExperience', rem: 'remExperience', aud: 'audioExperience', label: 'Experience & Openness to Bio', params: 'Past experience with biologicals, openness to GLS packages & Field Executive' },
  { key: 'scoreGrowth', rem: 'remGrowth', aud: 'audioGrowth', label: 'Growth Orientation', params: 'Interest in Authorised/Exclusive status, capacity for ₹2.5–7.5 Lacs revenue' },
];

const INDIAN_BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", 
  "Punjab National Bank", "Bank of Baroda", "Bank of India", "Union Bank of India", 
  "Canara Bank", "IDFC First Bank", "IndusInd Bank", "Yes Bank", "Federal Bank",
  "Central Bank of India", "Indian Bank", "Indian Overseas Bank", "UCO Bank", "Bank of Maharashtra"
];

export const DealerOnboardingScreen = ({ navigation, route }: any) => {
  const { form, step, setStep, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, generatePDF, isEditing } = useDealerOnboarding(navigation, route);
  const { control, watch, setValue } = form;
  const [jumpBackTo, setJumpBackTo] = React.useState<number | null>(null);

  const dynamicChecklistDocs = useMemo(() => {
    const checked = watch('complianceChecklist') || [];
    return checked.map((item: string) => ({ 
      key: item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(), 
      label: item 
    }));
  }, [watch('complianceChecklist')]);

  const shopLocation = watch('shopLocation');

  const WEST_INDIA_CROPS = [
    "Cotton", "Groundnut", "Sugarcane", "Wheat", "Bajra (Pearl Millet)", "Jowar (Sorghum)", 
    "Maize", "Castor", "Mustard", "Cumin", "Fennel", "Coriander", "Soybean", "Pigeon Pea (Tur)", 
    "Gram (Chana)", "Mango", "Banana", "Papaya", "Pomegranate", "Onion", "Garlic", "Potato", 
    "Tomato", "Brinjal", "Okra", "Chilli", "Turmeric"
  ].sort();

  const DEMO_SUPPLIERS = ["Bayer", "Syngenta", "UPL", "Corteva", "FMC", "PI Industries", "Coromandel", "IFFCO"];
  const DEMO_CHEMICALS = ["Urea", "DAP", "MOP", "SSP", "Complex Fertilizers", "Herbicides", "Insecticides", "Fungicides"];
  const DEMO_BIOS = ["Bio-Fertilizers", "Bio-Pesticides", "Mycorrhiza", "Seaweed Extract", "Amino Acids", "Humic Acid", "PGPR"];
  const DEMO_OTHERS = ["Seeds", "Micronutrients", "Tractors", "Implements", "Irrigation Equipment", "Tarpaulins"];

  // --- GITHUB REPO CASCADING LOCATION LOGIC ---
  const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
    "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
    "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
    "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
    "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  const [stateData, setStateData] = React.useState<any>(null);
  const [cities, setCities] = React.useState<string[]>([]);
  const [talukas, setTalukas] = React.useState<string[]>([]);
  const [villages, setVillages] = React.useState<string[]>([]);
  
  const [loadingLoc, setLoadingLoc] = React.useState(false);

  const selectedState = watch('state');
  const selectedCity = watch('city');
  const selectedTaluka = watch('taluka');

  // 1. Fetch the entire State JSON file from GitHub when State changes
  React.useEffect(() => {
    if (!selectedState) {
      setStateData(null);
      setCities([]);
      return;
    }
    
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        const url = `https://raw.githubusercontent.com/internnuv-oss/indian-cities-and-villages/master/By%20States/${encodeURIComponent(selectedState)}.json`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error("State file not found.");
        
        const data = await res.json();
        setStateData(data);
      } catch (e) {
        console.error("Failed to fetch state data. Ensure the state name matches the repo exactly.", e);
        setCities([]);
        setStateData(null);
      } finally {
        setLoadingLoc(false);
      }
    };
    
    fetchStateData();
  }, [selectedState]);

  // 2. Extract Cities (Districts) when stateData is loaded
  React.useEffect(() => {
    if (!stateData || !stateData.districts) {
      setCities([]);
      return;
    }
    const districtNames = stateData.districts.map((d: any) => d.district).sort();
    setCities(districtNames);
  }, [stateData]);

  // 3. Extract Talukas (subDistricts) when City changes
  React.useEffect(() => {
    if (!selectedCity || !stateData || !stateData.districts) {
      setTalukas([]);
      return;
    }
    const districtObj = stateData.districts.find((d: any) => d.district === selectedCity);
    if (districtObj && districtObj.subDistricts) {
      const subDistrictNames = districtObj.subDistricts.map((sd: any) => sd.subDistrict).sort();
      setTalukas(subDistrictNames);
    } else {
      setTalukas([]);
    }
  }, [selectedCity, stateData]);

  // 4. Extract Villages when Taluka changes
  React.useEffect(() => {
    if (!selectedTaluka || !selectedCity || !stateData || !stateData.districts) {
      setVillages([]);
      return;
    }
    
    const districtObj = stateData.districts.find((d: any) => d.district === selectedCity);
    if (districtObj && districtObj.subDistricts) {
      const subDistrictObj = districtObj.subDistricts.find((sd: any) => sd.subDistrict === selectedTaluka);
      if (subDistrictObj && subDistrictObj.villages) {
        setVillages([...subDistrictObj.villages].sort());
      } else {
        setVillages([]);
      }
    } else {
      setVillages([]);
    }
  }, [selectedTaluka, selectedCity, stateData]);

  // 5 back handler
  React.useEffect(() => {
    const handleBackPress = () => {
      if (jumpBackTo) {
        setStep(jumpBackTo);
        setJumpBackTo(null);
        return true; 
      }
      if (step > 1) {
        setStep(step - 1);
        return true; 
      }
      return false; 
    };

    // ✅ 1. Store the subscription returned by addEventListener
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    // ✅ 2. Call .remove() directly on the subscription for cleanup
    return () => backSubscription.remove();
  }, [step, jumpBackTo]);
  // --- END GITHUB REPO LOGIC ---

  if (showSuccess) {
    return (
      <FeedbackScreenTemplate
        iconName="check-circle" tone="success" animationType="pulse"
        title={isEditing ? "Profile Updated!" : "Profile Submitted!"}
        description={isEditing ? "The dealer profile has been successfully updated." : "The dealer has been successfully onboarded and saved to the database."}
        
        // Share PDF as green text link
        primaryActionLabel="Share PDF" 
        onPrimaryAction={generatePDF}
        primaryActionVariant="text"
        primaryActionIcon="share"
        
        // Add Another Dealer with person-add icon
        secondaryActionLabel={isEditing ? undefined : "Add Another Dealer"} 
        onSecondaryAction={isEditing ? undefined : () => { setShowSuccess(false); form.reset(); setStep(1); }}
        secondaryActionIcon="person-add"
        
        // Go Home with home icon
        tertiaryActionLabel="Go Home" 
        onTertiaryAction={() => navigation.navigate("MainTabs")}
        tertiaryActionIcon="home"
      />
    );
  }

  const getDynamicTableData = (key: string, score: number) => {
    if (key === 'scoreFinancial') {
      const headers = ["Annual Turnover (INR)", "Payment Discipline / Evidence"];
      if (score <= 2) return { headers, row: ["₹5L - ₹10L", "Frequent defaults; relies on local high-interest lenders; high debt."] };
      if (score <= 4) return { headers, row: ["₹10L - ₹25L", "\"Hand-to-mouth\" cash flow; pays only after 60+ days or multiple reminders."] };
      if (score <= 6) return { headers, row: ["₹25L - ₹60L", "Stable; pays within standard 30-day credit cycles; uses bank CC limits."] };
      if (score <= 8) return { headers, row: ["₹60L - ₹1 Cr", "Strong liquidity; pays before due dates; high credit limit with MNCs."] };
      return { headers, row: ["> ₹1 Cr", "Cash-rich; often pays advance for extra margins; zero payment friction."] };
    }
    if (key === 'scoreReputation') {
      const headers = ["Farmer & Peer Feedback", "Remarks / Evidence"];
      if (score <= 2) return { headers, row: ["Negative feedback", "Known for selling \"expired\" or \"substandard\" stock; price-cutter."] };
      if (score <= 4) return { headers, row: ["Neutral/Basic", "Perceived as a \"small player\"; farmers go there only for convenience."] };
      if (score <= 6) return { headers, row: ["Reliable", "Known for fair pricing and providing standard, genuine products."] };
      if (score <= 8) return { headers, row: ["Respected Advisor", "Farmers seek his advice on pest management; high ethical standing."] };
      return { headers, row: ["Market Leader", "Influences village-level decisions; acts as a \"community leader.\""] };
    }
    if (key === 'scoreOperations') {
      const headers = ["Infrastructure", "Hygiene & Condition"];
      if (score <= 2) return { headers, row: ["<200 sq. ft. shop", "No godown; stock kept in the shop or outside; messy/dirty."] };
      if (score <= 4) return { headers, row: ["Standard shop", "No separate godown; stock piled in corners; branding is hidden."] };
      if (score <= 6) return { headers, row: ["Clean shop + Room", "Small storage room attached; pallets used; visible counters."] };
      if (score <= 8) return { headers, row: ["Large shop + Godown", "1 dedicated off-site godown; prime location; clear GLS branding."] };
      return { headers, row: ["\"Model\" Outlet", "2+ large godowns; separate office; digital billing; showroom-feel."] };
    }
    if (key === 'scoreFarmerNetwork') {
      const headers = ["Active Farmer Base", "Village Coverage"];
      if (score <= 2) return { headers, row: ["< 40 farmers", "Limited to the immediate neighborhood only."] };
      if (score <= 4) return { headers, row: ["40 - 80 farmers", "Covers 2-3 nearby villages."] };
      if (score <= 6) return { headers, row: ["80 - 150 farmers", "Covers 4-7 villages; good repeat walk-in customers."] };
      if (score <= 8) return { headers, row: ["150 - 250 farmers", "Covers 8-12 villages; farmers travel long distances to visit."] };
      return { headers, row: ["> 250 farmers", "Covers 15+ villages (Entire Block); massive loyalty."] };
    }
    if (key === 'scoreTeam') {
      const headers = ["Owner/Staff Status", "Willingness for Training"];
      if (score <= 2) return { headers, row: ["Owner absent", "No staff; shop managed by untrained family/helpers."] };
      if (score <= 4) return { headers, row: ["Owner semi-active", "1 helper (unskilled); resistant to new technical methods."] };
      if (score <= 6) return { headers, row: ["Owner active", "1-2 trained staff; participates in training occasionally."] };
      if (score <= 8) return { headers, row: ["Professional Setup", "3+ staff; dedicated field person; eager for technical growth."] };
      return { headers, row: ["Highly Proactive", "Organized team; dedicated demo executive; hosts training for farmers."] };
    }
    if (key === 'scorePortfolio') {
      const headers = ["Product Range Focus", "% of Branded vs. Generic"];
      if (score <= 2) return { headers, row: ["Commodities", "Only Urea/DAP; focuses on low-margin generic bulk."] };
      if (score <= 4) return { headers, row: ["Generic Mix", "Mostly seeds & 80% generic/unbranded pesticides."] };
      if (score <= 6) return { headers, row: ["Balanced", "Mix of branded and generic; stocks standard seeds."] };
      if (score <= 8) return { headers, row: ["High-Value", "Focuses on specialty chemicals; values quality over price."] };
      return { headers, row: ["Premium", "Specialized in Horticulture/IPM; pushes high-end solutions."] };
    }
    if (key === 'scoreExperience') {
      const headers = ["Past Experience", "Current Bio % of Sales"];
      if (score <= 2) return { headers, row: ["Negative", "\"Bio doesn't work\" mindset; 0% Bio sales."] };
      if (score <= 4) return { headers, row: ["Skeptical", "Has tried poor quality bio before; <3% Bio sales."] };
      if (score <= 6) return { headers, row: ["Open", "Sells bio on recommendation; 3-8% Bio sales."] };
      if (score <= 8) return { headers, row: ["Bio-Proactive", "Willing to stock GLS packages; 8-15% Bio sales."] };
      return { headers, row: ["\"Bio-Expert\"", "Actively pushes biologicals as first-line defense; >15% Bio sales."] };
    }
    if (key === 'scoreGrowth') {
      const headers = ["Revenue Potential (GLS)", "Interest in Partnership"];
      if (score <= 2) return { headers, row: ["< ₹1 Lac", "No interest; \"just another supplier\" attitude."] };
      if (score <= 4) return { headers, row: ["₹1 - ₹2 Lacs", "Content with current scale; no commitment to targets."] };
      if (score <= 6) return { headers, row: ["₹2.5 - ₹4 Lacs", "Wants \"Authorized\" status; will share farmer data."] };
      if (score <= 8) return { headers, row: ["₹4 - ₹6 Lacs", "High interest in exclusivity; requests branding/marketing help."] };
      return { headers, row: ["₹7.5 Lacs +", "Wants to be the lead regional partner; drives massive volume."] };
    }
    
    // Fallback just in case
    return { 
      headers: ["Evaluation Parameter", "Score Implication"], 
      row: ["Standard Assessment", "Score determines overall profile capability."] 
    };
  };

  const getCategoryColor = (band: string) => {
    if (band === 'Elite') return '#3730A3'; // Premium Deep Indigo
    if (band === 'A-Category') return '#166534';       // Solid Forest Green
    if (band === 'B-Category') return '#B45309';       // Rich Amber / Bronze
    return '#991B1B';                                  // Crimson Red
  };

  const getCategoryBg = (band: string) => {
    if (band === 'Elite') return '#E0E7FF'; // Soft Indigo Background
    if (band === 'A-Category') return '#DCFCE7';       // Soft Green Background
    if (band === 'B-Category') return '#FEF3C7';       // Soft Amber Background
    return '#FEE2E2';                                  // Soft Red Background
  };

  return (
    <WizardFlowTemplate
      headerTitle={isEditing ? "Edit Dealer Profile" : "Dealer Onboarding"} stepLabel={`STEP ${step} OF 9`} progress01={step / 9}
      onBack={() => {
        if (jumpBackTo) {
          setStep(jumpBackTo);
          setJumpBackTo(null);
        } else {
          step > 1 ? setStep(step - 1) : navigation.goBack();
        }
      }}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {!isEditing && <View style={{ flex: 1 }}><Button label="Save Draft" variant="secondary" onPress={saveDraft} disabled={isSubmitting} /></View>}
          <View style={{ flex: 1 }}>
            {step < 9 ? (
              // ✅ UPDATE 2: Handle the Next button
              <Button 
                label={jumpBackTo ? "Return to Review" : "Next"} 
                onPress={() => {
                  if (jumpBackTo) {
                    setStep(jumpBackTo);
                    setJumpBackTo(null); // Clear memory after jumping
                  } else {
                    setStep(step + 1);
                  }
                }} 
                disabled={!isNextEnabled} 
              /> 
            ) : (
              <Button label={isEditing ? "Save Changes" : "Submit Profile"} onPress={submit} loading={isSubmitting} disabled={!isNextEnabled} />
            )}
          </View>
        </View>
      }
    >
      {/* STEPS 1-5 Remain Unchanged, omitted for brevity but include your previous code here */}
      {step === 1 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Basic Information</Text>
          
          <Controller control={control} name="shopName" render={({field}) => <Input label="Shop / Firm Name *" value={field.value} onChangeText={field.onChange} placeholder="e.g. Kisan Seva Kendra" error={form.formState.errors.shopName?.message} />} />
          <Controller control={control} name="ownerName" render={({field}) => <Input label="Owner Name *" value={field.value} onChangeText={field.onChange} placeholder="e.g. Ramesh Patel" error={form.formState.errors.ownerName?.message} />} />
          <Controller control={control} name="contactMobile" render={({field}) => <Input label="Mobile Number *" value={field.value} onChangeText={field.onChange} prefix="+91" keyboardType="phone-pad" maxLength={10} placeholder="9876543210" error={form.formState.errors.contactMobile?.message} />} />
          
          {/* Cascading Location Dropdowns */}
          <Controller control={control} name="state" render={({field}) => (
            <SelectField 
              label="State *" 
              value={field.value ?? ''} 
              options={INDIAN_STATES} 
              searchable 
              onChange={(val) => { 
                field.onChange(val); 
                setValue('city', ''); 
                setValue('taluka', ''); 
                setValue('village', ''); 
              }} 
              error={form.formState.errors.state?.message} 
            />
          )} />

          <Controller control={control} name="city" render={({field}) => (
            <SelectField 
              label={loadingLoc ? "City/District (Loading...) *" : "City/District *"} 
              value={field.value ?? ''} 
              options={cities} 
              searchable 
              onChange={(val) => {
                field.onChange(val);
                setValue('taluka', '');
                setValue('village', '');
              }} 
              error={form.formState.errors.city?.message} 
            />
          )} />

          <Controller control={control} name="taluka" render={({field}) => (
            <SelectField 
              label="Taluka/Tehsil *" 
              value={field.value ?? ''} 
              options={talukas} 
              searchable 
              onChange={(val) => {
                field.onChange(val);
                setValue('village', '');
              }} 
              error={form.formState.errors.taluka?.message} 
            />
          )} />

          <Controller control={control} name="village" render={({field}) => (
            <SelectField 
              label="Village *" 
              value={field.value ?? ''} 
              options={villages} 
              searchable 
              onChange={field.onChange} 
              error={form.formState.errors.village?.message} 
            />
          )} />

          <Controller control={control} name="address" render={({field}) => <TextArea label="Shop Address *" value={field.value} onChangeText={field.onChange} placeholder="Full postal address" error={form.formState.errors.address?.message} />} />
          
          {/* Optional Fields (Now only Landmark) */}
          <Controller control={control} name="landmark" render={({field}) => <Input label="Landmark" value={field.value} onChangeText={field.onChange} placeholder="e.g. Near Bus Stand" />} />
          
          {/* Newly Required Fields */}
          <Controller control={control} name="gstNumber" render={({field}) => <Input label="GST Number *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} error={form.formState.errors.gstNumber?.message} />} />
          <Controller control={control} name="panNumber" render={({field}) => <Input label="PAN Number *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} error={form.formState.errors.panNumber?.message} />} />
          <Controller control={control} name="estYear" render={({field}) => <YearPickerField label="Establishment Year *" value={field.value ?? ''} onChange={field.onChange} placeholder="Select Year" error={form.formState.errors.estYear?.message} />} />
          <Controller control={control} name="firmType" render={({field}) => <SelectField label="Type of Firm *" value={field.value ?? ''} options={['Proprietorship', 'Partnership', 'Pvt Ltd']} onChange={field.onChange} error={form.formState.errors.firmType?.message} />} />

          <Text style={{ fontSize: 16, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.md }}>Bank Details</Text>
          <Controller control={control} name="bankName" render={({field}) => <SelectField label="Bank Name *" value={field.value ?? ''} options={INDIAN_BANKS.sort()} searchable onChange={field.onChange} error={form.formState.errors.bankName?.message} />} />
          <Controller control={control} name="bankBranch" render={({field}) => <Input label="Branch Name *" value={field.value} onChangeText={field.onChange} placeholder="e.g. MG Road Branch" error={form.formState.errors.bankBranch?.message} />} />
          <Controller control={control} name="bankAccountName" render={({field}) => <Input label="Account Holder Name *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.bankAccountName?.message} />} />
          
          {/* Validated Fields based on schema */}
          <Controller control={control} name="bankAccountNumber" render={({field}) => <Input label="Account Number *" value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={18} placeholder="Enter exact account no." error={form.formState.errors.bankAccountNumber?.message} />} />
          <Controller control={control} name="bankIfsc" render={({field}) => <Input label="IFS Code *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="e.g. HDFC0001234" maxLength={11} error={form.formState.errors.bankIfsc?.message} />} />
        </View>
      )}
      
      {step === 2 && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 20, fontWeight: '800' }}>Profiling & Scoring</Text>
            <View style={{ backgroundColor: getCategoryBg(scoreData.band), paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
              <Text style={{ fontWeight: '900', color: getCategoryColor(scoreData.band) }}>SCORE: {scoreData.raw} ({scoreData.band})</Text>
            </View>
          </View>

          {SCORING_ASPECTS.map((aspect) => {
            const tableData = getDynamicTableData(aspect.key, watch(aspect.key as any) || 5);
            
            return (
              <View key={aspect.key} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
                <Controller control={control} name={aspect.key as any} render={({field}) => <ScoreSlider label={aspect.label} value={field.value} onChange={field.onChange} />} />
                
                {/* Guidelines & Dynamic Description Table */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Evaluate Based On:
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500', marginBottom: 12, lineHeight: 18 }}>
                    {aspect.params}
                  </Text>
                  
                  {/* 2x2 Table */}
                  <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' }}>
                    {/* Header Row */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View style={{ flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{tableData.headers[0]}</Text>
                      </View>
                      <View style={{ flex: 1, padding: 8, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{tableData.headers[1]}</Text>
                      </View>
                    </View>
                    
                    {/* Data Row */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF' }}>
                      <View style={{ flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.primary, fontWeight: '600', lineHeight: 18 }}>
                          {tableData.row[0]}
                        </Text>
                      </View>
                      <View style={{ flex: 1, padding: 8, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.primary, fontWeight: '600', lineHeight: 18 }}>
                          {tableData.row[1]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <Controller control={control} name={aspect.rem as any} render={({field}) => <TextArea label="Remarks (Optional Text)" value={field.value} onChangeText={field.onChange} minHeight={60} placeholder="Type notes here..." />} />
                
                <Controller control={control} name={aspect.aud as any} render={({field}) => (
                  <AudioRecorder 
                    value={field.value} 
                    loading={uploading[aspect.aud]} 
                    onRecord={(uri) => handleAudioUpload(aspect.aud, uri)} 
                    onClear={() => { field.onChange(''); setValue(aspect.aud as any, ''); }} 
                  />
                )} />
              </View>
            );
          })}
          
          <View style={{ backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Controller control={control} name="redFlags" render={({field}) => <TextArea label="Red Flags Noted (If Any)" value={field.value} onChangeText={field.onChange} placeholder="Enter any critical warnings..." />} />
            
            <Controller control={control} name="audioRedFlags" render={({field}) => (
              <AudioRecorder 
                value={field.value} 
                loading={uploading['audioRedFlags']} 
                onRecord={(uri) => handleAudioUpload('audioRedFlags', uri)} 
                onClear={() => { field.onChange(''); setValue('audioRedFlags', ''); }} 
              />
            )} />
          </View>
        </View>
      )}

{step === 3 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Business Area & Status</Text>
          
          <Controller 
            control={control} 
            name="isLinkedToDistributor" 
            render={({field}) => (
              <RadioGroup 
                label="Are you linked to any distributor? *" 
                options={['Yes', 'No']} 
                value={field.value} 
                onChange={(val) => { 
                  field.onChange(val); 
                  if (val === 'No') setValue('linkedDistributors', []); 
                  else setValue('linkedDistributors', [{name: '', contact: ''}]); 
                }} 
              />
            )} 
          />

{watch('isLinkedToDistributor') === 'Yes' && (
            <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
              <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm }}>Distributor Details</Text>
              
              <Input 
                label="Name *" 
                value={watch('linkedDistributors')?.[0]?.name || ''} 
                onChangeText={(val) => {
                  const current = watch('linkedDistributors')?.[0] || { name: '', contact: '' };
                  setValue('linkedDistributors', [{ name: val, contact: current.contact }], { shouldValidate: true });
                }} 
                placeholder="Distributor Name" 
                error={form.formState.errors.linkedDistributors?.[0]?.name?.message}
              />
              
              <Input 
                label="Contact *" 
                value={watch('linkedDistributors')?.[0]?.contact || ''} 
                onChangeText={(val) => {
                  const current = watch('linkedDistributors')?.[0] || { name: '', contact: '' };
                  setValue('linkedDistributors', [{ name: current.name, contact: val }], { shouldValidate: true });
                }} 
                placeholder="9876543210" 
                keyboardType="phone-pad" 
                maxLength={10} 
                prefix="+91" 
                error={form.formState.errors.linkedDistributors?.[0]?.contact?.message}
              />
            </View>
          )}
          
          <View style={{ marginTop: spacing.xl }}>
            <Controller 
              control={control} 
              name="majorCrops" 
              render={({field}) => (
                <MultiSelectField 
                  label="Major Crops in Service Area *" 
                  options={WEST_INDIA_CROPS} 
                  value={field.value || []} 
                  onChange={field.onChange} 
                  searchable 
                  placeholder="Search and select crops" 
                />
              )} 
            />
            <Controller control={control} name="acresServed" render={({field}) => <Input label="Average Acres Served per Farmer" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 10" />} />
            <Controller control={control} name="proposedStatus" render={({field}) => <RadioGroup label="Proposed Status *" options={['Authorised Dealer', 'Exclusive Dealer']} value={field.value} onChange={field.onChange} />} />
            <Controller control={control} name="willingDemoFarmers" render={({field}) => <RadioGroup label="Willing to work with 5–10 demo farmers per season? *" options={['Yes', 'No']} value={field.value} onChange={field.onChange} />} />
          </View>
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>GLS Commitments</Text>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Tick to confirm acceptance from the dealer.</Text>
          <Controller control={control} name="glsCommitments" render={({field}) => (
            <View>{GLS_COMMITMENTS.map((item) => <CheckboxItem key={item} label={item} checked={field.value?.includes(item)} onChange={(checked) => { const curr = new Set(field.value); checked ? curr.add(item) : curr.delete(item); field.onChange(Array.from(curr)); }}/>)}</View>
          )} />
        </View>
      )}

      {step === 5 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>Regulatory Compliance</Text>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Verify dealer documentation availability.</Text>
          <Controller control={control} name="complianceChecklist" render={({field}) => (
            <View>{COMPLIANCE_ITEMS.map((item) => <CheckboxItem key={item} label={item} checked={field.value?.includes(item)} onChange={(checked) => { const curr = new Set(field.value); checked ? curr.add(item) : curr.delete(item); field.onChange(Array.from(curr)); }}/>)}</View>
          )} />
        </View>
      )}

{step === 6 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Documents & Photos</Text>
          
          {/* 1. Core Documents */}
          <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm }}>Core Documents</Text>
          {['gst certificate / shop establishment license', 'pan card', 'cancelled cheque'].map((key) => (
            <View key={key} style={{ marginBottom: spacing.md }}>
              <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{key.toUpperCase()} *</Text>
              <UploadTile 
                value={watch('documents')?.[key]} 
                loading={uploading[key]} 
                onUpload={(source) => handleUpload(key, source)} // <-- UPDATED
                onClear={() => { const d = {...watch('documents')}; delete d[key]; setValue('documents', d); }} 
              />
            </View>
          ))}

          {/* 2. Shop Photos (Camera Only & Integrated GPS) */}
          <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Shop Photos (Capture Multiple)</Text>
          {[
            { key: 'shop_exterior', label: '1. Exterior (Store Front)', optional: false },
            { key: 'shop_interior', label: '2. Interior (Stock Images)', optional: true },
            { key: 'shop_godown', label: '3. Godown Images', optional: true }
          ].map((photo) => {
             const rawDocValue = watch('documents')?.[photo.key];
             const docsArray = Array.isArray(rawDocValue) ? rawDocValue : (rawDocValue ? [rawDocValue] : []);
             const loc = watch('shopLocation');
             
             return (
               <View key={photo.key} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
                 <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8 }}>
                   {photo.label} {!photo.optional && '*'}
                   {photo.optional && <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}> (Optional)</Text>}
                 </Text>
                 
                 {/* Map through all captured photos in this category */}
                 {docsArray.map((docUrl, index) => (
                   <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md, marginBottom: 8 }}>
                     <MaterialIcons name="check-circle" size={28} color={colors.primary} />
                     <View style={{ flex: 1, marginLeft: 12 }}>
                       <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>Photo {index + 1} Captured</Text>
                       {loc && loc.lat && loc.lng ? (
                         <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 }}>📍 GPS: {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</Text>
                       ) : (
                         <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '600', marginTop: 2 }}>⚠️ GPS Failed</Text>
                       )}
                     </View>
                     <Pressable onPress={() => { 
                        const d = {...watch('documents')}; 
                        const newArray = docsArray.filter((_, i) => i !== index);
                        if (newArray.length > 0) d[photo.key] = newArray;
                        else delete d[photo.key]; // Remove key completely if empty
                        setValue('documents', d, { shouldValidate: true }); 
                     }} style={{ padding: 8 }}>
                       <MaterialIcons name="delete" size={22} color={colors.danger} />
                     </Pressable>
                   </View>
                 ))}
                 
                 {/* Always show the capture button to allow multiple additions */}
                 <Pressable 
                   onPress={() => handleUpload(photo.key, 'camera')} 
                   style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}
                 >
                   {uploading[photo.key] ? (
                     <ActivityIndicator size="small" color={colors.primary} />
                   ) : (
                     <MaterialIcons name={docsArray.length > 0 ? "add-a-photo" : "camera-alt"} size={28} color={colors.primary} />
                   )}
                   <View style={{ flex: 1, marginLeft: 12 }}>
                     <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>
                       {docsArray.length > 0 ? "Capture Another Image" : "Capture Image"}
                     </Text>
                     <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: '500' }}>GPS will be captured automatically</Text>
                   </View>
                 </Pressable>
               </View>
             );
          })}

          {/* Selfie with Owner (Camera Only) */}
          <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Selfie Verification</Text>
          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
            <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8 }}>Selfie with Owner *</Text>
            
            {watch('documents')?.['selfie_with_owner'] ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md }}>
                <MaterialIcons name="check-circle" size={28} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>Selfie Captured</Text>
                </View>
                <Pressable onPress={() => { 
                  const d = {...watch('documents')}; 
                  delete d['selfie_with_owner']; 
                  setValue('documents', d, { shouldValidate: true }); 
                }} style={{ padding: 8 }}>
                  <MaterialIcons name="delete" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ) : (
              <Pressable 
                onPress={() => handleUpload('selfie_with_owner', 'camera')} 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}
              >
                {uploading['selfie_with_owner'] ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="person-add-alt-1" size={28} color={colors.primary} />
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>Capture Selfie</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: '500' }}>Take a clear photo with the shop owner</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* 3. Dynamic Compliance Checklist Documents */}
          {watch('complianceChecklist')?.length > 0 && (
            <>
              <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Compliance Documents</Text>
              {watch('complianceChecklist').map((item: string) => {
                const key = item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                return (
                  <View key={key} style={{ marginBottom: spacing.md }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{item} *</Text>
                    <UploadTile 
                      value={watch('documents')?.[key]} 
                      loading={uploading[key]} 
                      onUpload={(source) => handleUpload(key, source)} // <-- UPDATED
                      onClear={() => { const d = {...watch('documents')}; delete d[key]; setValue('documents', d); }} 
                    />
                  </View>
                );
              })}
            </>
          )}

          {/* 4. Farmer Customers List (Optional) */}
          <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Additional Files</Text>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>Farmer Customers List (Optional)</Text>
            <UploadTile 
              value={watch('documents')?.['farmer_list']} 
              loading={uploading['farmer_list']} 
              onUpload={(source) => handleUpload('farmer_list', source)} // <-- UPDATED
              onClear={() => { const d = {...watch('documents')}; delete d['farmer_list']; setValue('documents', d); }} 
            />
          </View>
        </View>
      )}

{step === 7 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>SE Evaluation & Annexures</Text>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Fill out the territory and business details to generate the final agreement.</Text>

          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Annexure A: Territory Coverage</Text>
            
            <Controller control={control} name="seTalukasCovered" render={({field}) => (
              <MultiSelectField label="Talukas covered *" value={field.value || []} options={talukas.length > 0 ? talukas : ['Please select City in Step 1 first']} onChange={field.onChange} searchable placeholder="Search Talukas" />
            )} />
            
            <Controller control={control} name="seVillagesCovered" render={({field}) => (
              <MultiSelectField label="Villages covered *" value={field.value || []} options={villages.length > 0 ? villages : ['Please select Taluka in Step 1 first']} onChange={field.onChange} searchable placeholder="Search Villages" />
            )} />
            
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.sm }}>
              <View style={{ flex: 2 }}>
                <Controller control={control} name="seTotalCultivableArea" render={({field}) => <Input label="Total cultivable area *" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 1500" />} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="seTotalCultivableAreaUnit" render={({field}) => <SelectField label="Unit *" value={field.value || 'Acres'} options={['Acres', 'Hectares']} onChange={field.onChange} />} />
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Controller control={control} name="seMajorCrops" render={({field}) => (
                <MultiSelectField label="Major crops in territory *" value={field.value || []} options={WEST_INDIA_CROPS} onChange={field.onChange} searchable placeholder="Select crops" />
              )} />
            </View>
          </View>

          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Annexure B: Principal Companies & Products</Text>
            <Controller control={control} name="sePrincipalSuppliers" render={({field}) => <MultiSelectField label="List of current principal suppliers *" value={field.value || []} options={DEMO_SUPPLIERS} onChange={field.onChange} searchable placeholder="Select suppliers" />} />
            <Controller control={control} name="seChemicalProducts" render={({field}) => <MultiSelectField label="Chemical products range *" value={field.value || []} options={DEMO_CHEMICALS} onChange={field.onChange} searchable placeholder="Select chemicals" />} />
            <Controller control={control} name="seBioProducts" render={({field}) => <MultiSelectField label="Biological / organic products range *" value={field.value || []} options={DEMO_BIOS} onChange={field.onChange} searchable placeholder="Select biologicals" />} />
            <Controller control={control} name="seOtherProducts" render={({field}) => <MultiSelectField label="Other products (seeds, etc.) *" value={field.value || []} options={DEMO_OTHERS} onChange={field.onChange} searchable placeholder="Select other products" />} />
          </View>

          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Annexure C: Infrastructure Details</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <View style={{ flex: 2 }}>
                <Controller control={control} name="seGodownCapacity" render={({field}) => <Input label="Godown / storage capacity (Optional)" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 500" />} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="seGodownCapacityUnit" render={({field}) => <SelectField label="Unit" value={field.value || 'Sq.ft'} options={['Sq.ft', 'Sq.m']} onChange={field.onChange} />} />
              </View>
            </View>
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
                      {index > 0 && (
                        <Pressable onPress={() => { 
                          const newRefs = (watch('seCreditReferences') || []).filter((_, i) => i !== index); 
                          setValue('seCreditReferences', newRefs, {shouldValidate: true}); 
                        }}>
                          <MaterialIcons name="close" size={20} color={colors.danger} />
                        </Pressable>
                      )}
                    </View>
                    <Input label="Supplier Name *" value={ref.name} placeholder="e.g. Ramesh Agro" onChangeText={(val) => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].name = val; setValue('seCreditReferences', refs, {shouldValidate: true}); }} />
                    <Input label="Contact Number *" value={ref.contact} placeholder="9876543210" prefix="+91" maxLength={10} keyboardType="phone-pad" onChangeText={(val) => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].contact = val; setValue('seCreditReferences', refs, {shouldValidate: true}); }} />
                    
                    <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 4, marginTop: 8 }}>Last 12-month payment behavior *</Text>
                    <TextArea label="Behavior Notes" placeholder="Type behavior here..." value={ref.behavior} onChangeText={(val) => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].behavior = val; setValue('seCreditReferences', refs, {shouldValidate: true}); }} />
                    <Text style={{ textAlign: 'center', marginVertical: 4, color: colors.textMuted, fontWeight: '800' }}>OR</Text>
                    <AudioRecorder 
                      value={ref.behaviorAudio} 
                      loading={uploading[`seCreditReferences.${index}.behaviorAudio`]} 
                      onRecord={(uri) => handleAudioUpload(`seCreditReferences.${index}.behaviorAudio`, uri)} 
                      onClear={() => { const refs = [...(watch('seCreditReferences') || [])]; refs[index].behaviorAudio = ''; setValue('seCreditReferences', refs, {shouldValidate: true}); }} 
                    />
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
            <Controller control={control} name="seWillShareSales" render={({field}) => <CheckboxItem label="Dealer confirms they will share monthly GLS sales breakup (dealer-wise, crop-wise) *" checked={field.value} onChange={field.onChange} />} />
            
            <View style={{ marginTop: spacing.md }}>
              {/* Changed label from * to (Optional) */}
              <Text style={{ fontWeight: '700', fontSize: 12, marginBottom: 4 }}>Future Expansion Plan (2-year growth vision) (Optional)</Text>
              <Controller control={control} name="seGrowthVision" render={({field}) => <TextArea label="Vision Notes" placeholder="Type vision here..." value={field.value} onChangeText={field.onChange} />} />
              <Text style={{ textAlign: 'center', marginVertical: 8, color: colors.textMuted, fontWeight: '800' }}>OR</Text>
              <Controller control={control} name="seGrowthVisionAudio" render={({field}) => (
                <AudioRecorder 
                  value={field.value} 
                  loading={uploading['seGrowthVisionAudio']} 
                  onRecord={(uri) => handleAudioUpload('seGrowthVisionAudio', uri)} 
                  onClear={() => { field.onChange(''); setValue('seGrowthVisionAudio', ''); }} 
                />
              )} />
            </View>
          </View>

          {/* Section E block - Security Deposit */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.sm, color: colors.primary }}>Section E: Terms & Conditions Variables</Text>
            <Controller control={control} name="seSecurityDeposit" render={({field}) => <Input label="Security Deposit Amount (If applicable)" prefix="₹" value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="50000" />} />
          </View>
        </View>
      )}

{step === 8 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>Dealer Agreement</Text>
          
          {/* Scrollable Terms & Conditions Box */}
          <ScrollView 
            style={{ backgroundColor: '#F1F5F9', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg, maxHeight: 450, borderWidth: 1, borderColor: colors.border }}
            nestedScrollEnabled={true}
          >
             {/* Annexure A */}
             <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Annexure – A: Territory Coverage</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 16 }}>
               <Text style={{ fontWeight: 'bold', color: colors.text }}>Talukas covered: </Text>{watch('seTalukasCovered')?.join(', ') || 'N/A'}{'\n'}
               <Text style={{ fontWeight: 'bold', color: colors.text }}>Villages covered: </Text>{watch('seVillagesCovered')?.join(', ') || 'N/A'}{'\n'}
               <Text style={{ fontWeight: 'bold', color: colors.text }}>Total cultivable area: </Text>{watch('seTotalCultivableArea') ? `${watch('seTotalCultivableArea')} ${watch('seTotalCultivableAreaUnit') || 'Acres'}` : 'N/A'}{'\n'}
               <Text style={{ fontWeight: 'bold', color: colors.text }}>Major crops in territory: </Text>{watch('seMajorCrops')?.join(', ') || 'N/A'}
             </Text>

             {/* Annexure B */}
             <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Annexure – B: Principal Companies & Product Range</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 16 }}>
               <Text style={{ fontWeight: 'bold', color: colors.text }}>1. Principal suppliers: </Text>{watch('sePrincipalSuppliers')?.join(', ') || 'N/A'}{'\n'}
               <Text style={{ fontWeight: 'bold', color: colors.text }}>2. Chemical products range: </Text>{watch('seChemicalProducts')?.join(', ') || 'N/A'}{'\n'}
               <Text style={{ fontWeight: 'bold', color: colors.text }}>3. Biological / organic products range: </Text>{watch('seBioProducts')?.join(', ') || 'N/A'}{'\n'}
               <Text style={{ fontWeight: 'bold', color: colors.text }}>4. Other products: </Text>{watch('seOtherProducts')?.join(', ') || 'N/A'}
             </Text>

             {/* Annexure C */}
             <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Annexure – C: Infrastructure Details</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 16 }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>Godown / storage capacity: </Text>{watch('seGodownCapacity') ? `${watch('seGodownCapacity')} ${watch('seGodownCapacityUnit') || 'Sq.ft'}` : 'N/A'}{'\n'}
               <Text style={{ fontWeight: 'bold', color: colors.text }}>Photos: </Text>{watch('documents')?.shop_exterior ? 'Captured' : 'N/A'}
             </Text>

             {/* Annexure D */}
             <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Annexure – D: Bank & Credit References</Text>
             {watch('seHasCreditReferences') === 'Yes' && watch('seCreditReferences')?.length ? (
               watch('seCreditReferences')?.map((ref, i) => (
                 <Text key={i} style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 4 }}>
                   <Text style={{ fontWeight: 'bold', color: colors.text }}>{i + 1}. {ref.name} ({ref.contact}): </Text>{ref.behavior || (ref.behaviorAudio ? '[Audio Recorded]' : 'N/A')}
                 </Text>
               ))
             ) : (
               <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 16 }}>No references provided.</Text>
             )}
             {watch('seHasCreditReferences') === 'Yes' && <View style={{marginBottom: 12}} />}

             {/* Annexure E */}
             <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Annexure – E: Monthly Sales Reporting Format</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 16 }}>
               Confirmation that they will share monthly GLS sales breakup (dealer-wise, crop-wise): <Text style={{ fontWeight: 'bold', color: colors.text }}>{watch('seWillShareSales') ? 'Confirmed' : 'Not Confirmed'}</Text>
             </Text>

             {/* Annexure F */}
             <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Annexure – F: Future Expansion Plan</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 24 }}>
               Their 2-year growth vision and willingness to focus on biologicals:{'\n'}
               <Text style={{ color: colors.text }}>{watch('seGrowthVision') || (watch('seGrowthVisionAudio') ? '[Audio Recorded]' : 'N/A')}</Text>
             </Text>

             {/* Terms & Conditions */}
             <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 8, textAlign: 'center' }}>Terms & Conditions for Appointment as GLS Distributor</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 16, textAlign: 'center' }}>The following terms form an integral part of the Dealer Appointment Letter / MoU and are binding upon signing.</Text>
             
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
               <Text style={{ fontWeight: 'bold', color: colors.text }}>1. Territory:{'\n'}</Text>The Dealer shall operate primarily in the villages / area mentioned in Annexure A. The Dealer agrees not to actively sell GLS products outside the agreed area without prior approval.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>2. Status & Focus:{'\n'}</Text>As an Authorised Dealer, the Dealer can directly honour GLS farmer schemes, loyalty benefits, and Farm Card discounts.{'\n'}As an Exclusive Dealer, the Dealer shall focus primarily on GLS biological products and receive maximum field and marketing support.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>3. Payment Terms:{'\n'}</Text>Payment to be made to the linked Distributor as per mutually agreed terms.{'\n'}Timely payment is essential to maintain smooth supply and scheme benefits.{'\n'}Delayed payments may result in temporary suspension of supplies or scheme eligibility.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>4. Security Deposit:{'\n'}</Text>(if applicable) A nominal refundable security deposit of ₹{watch('seSecurityDeposit') || '__________'} may be required as per Distributor / GLS policy.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>5. Stock Maintenance:{'\n'}</Text>The Dealer shall maintain adequate stock of GLS products to meet local farmer demand and shall store them properly (cool, dry place, away from direct sunlight).{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>6. Technical & Marketing Support from GLS:{'\n'}</Text>Access to dedicated Field Executives for farmer guidance and demonstrations.{'\n'}Crop-specific packages, Farm Card + Calendar, application training, and promotional material.{'\n'}Full participation in company-funded loyalty program and special schemes.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>7. Dealer Obligations:{'\n'}</Text>• Promote GLS products following recommended crop packages and practices.{'\n'}• Allow GLS Field Executives to engage directly with farmers linked to the shop.{'\n'}• Honour Farm Card, loyalty benefits, and crop-specific discounts for eligible farmers.{'\n'}• Maintain proper records of sales and farmer feedback.{'\n'}• Ensure the shop has valid FCO authorization and Insecticide selling license (where required).{'\n'}• Participate in demonstrations, farmer meetings, and training programs organized by GLS.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>8. Legal & Compliance:{'\n'}</Text>The Dealer must hold and maintain all necessary licenses (FCO for biofertilizers, Insecticide License for biopesticides, GST, Shop & Establishment). GLS shall not be responsible for any legal issues arising from the Dealer’s non-compliance.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>9. Data Sharing and Confidentiality:{'\n'}</Text>The Dealer agrees to share with GLS (and its authorised Field Executives) all necessary data generated during the partnership, including but not limited to:{'\n'}• Farmer details (name, contact, farm location, crop history, Farm Card records, application data, yield feedback).{'\n'}• Sales records of GLS products.{'\n'}• Any other information required for technical support, loyalty program execution, monitoring results, and business improvement.{'\n\n'}<Text style={{ fontWeight: 'bold', color: colors.text }}>Obligations:{'\n'}</Text>All shared data will be used by GLS only for the purpose of supporting farmers, implementing crop packages, running the loyalty program, and strengthening the partnership.{'\n'}The Dealer shall collect farmer consent where personal data is involved and shall comply with applicable data protection laws.{'\n'}Both parties shall keep all shared information confidential and shall not disclose it to any third party without prior written consent, except as required by law.{'\n'}Upon termination or request, the Dealer shall return or securely delete all GLS-related data in its possession.{'\n'}GLS shall similarly protect any confidential business information of the Dealer.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>10. Termination:{'\n'}</Text>Either party may terminate the appointment with 30 days’ written notice. Immediate termination may occur for breach of payment, license violation, misuse of data, or actions damaging GLS reputation. On termination, all pending dues must be settled and remaining stock adjusted.{'\n\n'}
               
               <Text style={{ fontWeight: 'bold', color: colors.text }}>11. Jurisdiction:{'\n'}</Text>All disputes shall be subject to the exclusive jurisdiction of courts in Vadodara, Gujarat.{'\n\n'}
               
               {/* Final I/We Agree To Statement */}
               <View style={{ backgroundColor: '#E2E8F0', padding: 12, borderRadius: radius.sm, marginTop: 12 }}>
                 <Text style={{ fontWeight: 'bold', color: colors.primary, marginBottom: 6, fontSize: 14 }}>I/We agree to:</Text>
                 <Text style={{ fontSize: 13, lineHeight: 22, color: colors.text }}>
                   • Promote GLS biological inputs following recommended crop packages.{'\n'}
                   • Allow GLS field team to engage with my farmers for demos and support.{'\n'}
                   • Honour loyalty program and Farm Card benefits for farmers.{'\n'}
                   • Maintain proper storage and display for GLS products.
                 </Text>
               </View>
             </Text>
             
             {/* Spacing for bottom of ScrollView */}
             <View style={{ height: 20 }} />
          </ScrollView>

          <Controller control={control} name="agreementAccepted" render={({field}) => <CheckboxItem label="I agree to all terms and conditions stated above." checked={field.value} onChange={field.onChange} />} />
          
          <View style={{ marginTop: spacing.xl }}>
            <Controller 
              control={control} 
              name="dealerSignature" 
              render={({field}) => (
                <View>
                  <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>Dealer Signature *</Text>
                  {/* ADDED: value={field.value} so it re-draws saved strokes */}
                  <SignaturePad 
                    height={250} 
                    value={field.value} 
                    onChange={(has, data) => field.onChange(has ? data : '')} 
                  />
                </View>
              )} 
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Controller 
              control={control} 
              name="seSignature" 
              render={({field}) => (
                <View>
                  <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>Sales Executive Signature *</Text>
                  {/* ADDED: value={field.value} so it re-draws saved strokes */}
                  <SignaturePad 
                    height={250} 
                    value={field.value} 
                    onChange={(has, data) => field.onChange(has ? data : '')} 
                  />
                </View>
              )} 
            />
          </View>
        </View>
      )}

{step === 9 && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Final Review</Text>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>Please verify all the details carefully before submitting the onboarding profile.</Text>

          {/* 1. Basic Information */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
               <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>1. Basic Info</Text>
               <Pressable onPress={() => { setJumpBackTo(9); setStep(1); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <MaterialIcons name="edit" size={16} color={colors.primary} />
  <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
</Pressable>
            </View>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Shop Name: <Text style={{ color: colors.text }}>{watch('shopName')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Owner Name: <Text style={{ color: colors.text }}>{watch('ownerName')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Mobile: <Text style={{ color: colors.text }}>+91 {watch('contactMobile')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Address: <Text style={{ color: colors.text }}>{watch('address')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Landmark: <Text style={{ color: colors.text }}>{watch('landmark') || 'N/A'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Location: <Text style={{ color: colors.text }}>{watch('village')}, {watch('taluka')}, {watch('city')}, {watch('state')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>GST Number: <Text style={{ color: colors.text }}>{watch('gstNumber')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>PAN Number: <Text style={{ color: colors.text }}>{watch('panNumber')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Firm Type: <Text style={{ color: colors.text }}>{watch('firmType')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 8 }}>Est. Year: <Text style={{ color: colors.text }}>{watch('estYear')}</Text></Text>
            
            <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 4 }}>Bank Details:</Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Bank Name: <Text style={{ color: colors.text }}>{watch('bankName')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Branch: <Text style={{ color: colors.text }}>{watch('bankBranch')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>A/c Name: <Text style={{ color: colors.text }}>{watch('bankAccountName')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>A/c Number: <Text style={{ color: colors.text }}>{watch('bankAccountNumber')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>IFSC Code: <Text style={{ color: colors.text }}>{watch('bankIfsc')}</Text></Text>
          </View>

          {/* 2. Profiling & Scoring */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
               <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>2. Profiling & Scoring</Text>
               <Pressable onPress={() => { setJumpBackTo(9); setStep(2); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <MaterialIcons name="edit" size={16} color={colors.primary} />
                 <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
               </Pressable>
            </View>
            <Text style={{ fontWeight: '900', fontSize: 18, color: getCategoryColor(scoreData.band), marginBottom: 8 }}>
              Overall: {scoreData.raw} Points ({scoreData.band})
            </Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Financial: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreFinancial')}/10</Text></Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Reputation: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreReputation')}/10</Text></Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Operations: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreOperations')}/10</Text></Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Network: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreFarmerNetwork')}/10</Text></Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Team: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreTeam')}/10</Text></Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Portfolio: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scorePortfolio')}/10</Text></Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Experience: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreExperience')}/10</Text></Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Growth: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreGrowth')}/10</Text></Text>
            </View>

            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Audio Notes Attached: <Text style={{ color: colors.text }}>{['audioFinancial', 'audioReputation', 'audioOperations', 'audioFarmerNetwork', 'audioTeam', 'audioPortfolio', 'audioExperience', 'audioGrowth'].filter(k => watch(k as any)).length}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Red Flags: <Text style={{ color: watch('redFlags') ? colors.danger : colors.text, fontWeight: watch('redFlags') ? '700' : '400' }}>{watch('redFlags') || 'None'}</Text></Text>
          </View>

          {/* 3. Business Details */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
               <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>3. Business Details</Text>
               <Pressable onPress={() => { setJumpBackTo(9); setStep(3); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <MaterialIcons name="edit" size={16} color={colors.primary} />
                 <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
               </Pressable>
            </View>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Linked to Distributor?: <Text style={{ color: colors.text }}>{watch('isLinkedToDistributor')}</Text></Text>
            {watch('isLinkedToDistributor') === 'Yes' && watch('linkedDistributors')?.map((dist, i) => (
              <Text key={i} style={{ color: colors.textMuted, marginBottom: 4, marginLeft: 8 }}>- {dist.name} ({dist.contact})</Text>
            ))}
            <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>Major Crops: <Text style={{ color: colors.text }}>{watch('majorCrops')?.join(', ') || 'N/A'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Avg Acres Served per Farmer: <Text style={{ color: colors.text }}>{watch('acresServed') || 'N/A'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Proposed Status: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('proposedStatus')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Willing for Demo Farmers: <Text style={{ color: colors.text }}>{watch('willingDemoFarmers')}</Text></Text>
          </View>

          {/* 4 & 5. Checklists */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
               <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>4 & 5. Commitments & Checklists</Text>
               <Pressable onPress={() => { setJumpBackTo(9); setStep(4); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <MaterialIcons name="edit" size={16} color={colors.primary} />
                 <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
               </Pressable>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4 }}>GLS Commitments Accepted:</Text>
            {watch('glsCommitments')?.map((c, i) => <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>✓ {c}</Text>)}
            
            <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 8 }}>Compliance Documents Available:</Text>
            {watch('complianceChecklist')?.length ? watch('complianceChecklist')?.map((c, i) => <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>✓ {c}</Text>) : <Text style={{ color: colors.textMuted, fontSize: 12 }}>None Selected</Text>}
          </View>

          {/* 6. Documents & Photos */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
               <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>6. Documents & Photos</Text>
               <Pressable onPress={() => { setJumpBackTo(9); setStep(6); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <MaterialIcons name="edit" size={16} color={colors.primary} />
                 <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
               </Pressable>
            </View>
            <Text style={{ color: colors.textMuted, marginBottom: 8 }}>Files Uploaded:</Text>
            {Object.entries(watch('documents') || {}).map(([key, val]) => (
               <Text key={key} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>
                 • {key.replace(/_/g, ' ').toUpperCase()}: <Text style={{ color: colors.primary, fontWeight: '700' }}>{Array.isArray(val) ? `${val.length} Files` : 'Uploaded'}</Text>
               </Text>
            ))}
            <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>GPS Location: <Text style={{ color: watch('shopLocation') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('shopLocation') ? `${watch('shopLocation')?.lat.toFixed(5)}, ${watch('shopLocation')?.lng.toFixed(5)}` : 'Missing'}</Text></Text>
          </View>

          {/* 7. SE Annexures */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
               <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>7. Annexures</Text>
               <Pressable onPress={() => { setJumpBackTo(9); setStep(7); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <MaterialIcons name="edit" size={16} color={colors.primary} />
                 <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
               </Pressable>
            </View>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Talukas Covered: <Text style={{ color: colors.text }}>{watch('seTalukasCovered')?.join(', ')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Villages Covered: <Text style={{ color: colors.text }}>{watch('seVillagesCovered')?.join(', ')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Total Area: <Text style={{ color: colors.text }}>{watch('seTotalCultivableArea') ? `${watch('seTotalCultivableArea')} ${watch('seTotalCultivableAreaUnit') || 'Acres'}` : 'N/A'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Major Crops: <Text style={{ color: colors.text }}>{watch('seMajorCrops')?.join(', ')}</Text></Text>
            
            <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>Principal Suppliers: <Text style={{ color: colors.text }}>{watch('sePrincipalSuppliers')?.join(', ')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Chemical Products: <Text style={{ color: colors.text }}>{watch('seChemicalProducts')?.join(', ')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Bio Products: <Text style={{ color: colors.text }}>{watch('seBioProducts')?.join(', ')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Other Products: <Text style={{ color: colors.text }}>{watch('seOtherProducts')?.join(', ')}</Text></Text>
            
            <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>Godown Capacity: <Text style={{ color: colors.text }}>{watch('seGodownCapacity') ? `${watch('seGodownCapacity')} ${watch('seGodownCapacityUnit') || 'Sq.ft'}` : 'N/A'}</Text></Text>
            
            <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 4 }}>Credit References:</Text>
            {watch('seHasCreditReferences') === 'Yes' && watch('seCreditReferences')?.length ? watch('seCreditReferences')?.map((ref, i) => (
              <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>{i+1}. {ref.name} ({ref.contact})</Text>
            )) : <Text style={{ color: colors.textMuted, fontSize: 12 }}>None</Text>}

            <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>Share Sales Data?: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('seWillShareSales') ? 'Yes' : 'No'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Growth Vision Provided?: <Text style={{ color: colors.text }}>{watch('seGrowthVision') || watch('seGrowthVisionAudio') ? 'Yes' : 'No'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Security Deposit: <Text style={{ color: colors.text }}>₹{watch('seSecurityDeposit') || '0'}</Text></Text>
          </View>

          {/* 8. Agreement & Signatures */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
               <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>8. Agreement & Signatures</Text>
               <Pressable onPress={() => { setJumpBackTo(9); setStep(8); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <MaterialIcons name="edit" size={16} color={colors.primary} />
                 <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
               </Pressable>
            </View>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Agreement Accepted: <Text style={{ color: watch('agreementAccepted') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('agreementAccepted') ? 'Yes' : 'No'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Dealer Signature: <Text style={{ color: watch('dealerSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('dealerSignature') ? 'Captured' : 'Missing'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>SE Signature: <Text style={{ color: watch('seSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('seSignature') ? 'Captured' : 'Missing'}</Text></Text>
          </View>

        </View>
      )}
    </WizardFlowTemplate>
  );
};