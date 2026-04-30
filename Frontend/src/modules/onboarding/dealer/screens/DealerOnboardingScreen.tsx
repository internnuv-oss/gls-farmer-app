import React from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../core/i18n';
import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../../design-system/templates';
import { Button } from '../../../../design-system/components';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { useDealerOnboarding } from '../hooks';

// Import our newly created steps
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Profiling } from './steps/Step2Profiling';
import { Step3Business } from './steps/Step3Business';
import { Step4Commitments } from './steps/Step4Commitments';
import { Step5Compliance } from './steps/Step5Compliance';
import { Step6Documents } from './steps/Step6Documents';
import { Step7Annexures } from './steps/Step7Annexures';
import { Step8Agreement } from './steps/Step8Agreement';
import { Step9Review } from './steps/Step9Review';

export const DealerOnboardingScreen = ({ navigation, route }: any) => {
  const { form, step, setStep, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, generatePDF, isEditing } = useDealerOnboarding(navigation, route);
  const { watch } = form;
  const [jumpBackTo, setJumpBackTo] = React.useState<number | null>(null);
  const { t } = useTranslation();

  const cycleLanguage = () => {
    const next = i18n.language === 'en' ? 'hi' : i18n.language === 'hi' ? 'gu' : 'en';
    i18n.changeLanguage(next);
  };

  // Shared Constants
  const WEST_INDIA_CROPS = ["Cotton", "Groundnut", "Sugarcane", "Wheat", "Bajra (Pearl Millet)", "Jowar (Sorghum)", "Maize", "Castor", "Mustard", "Cumin", "Fennel", "Coriander", "Soybean", "Pigeon Pea (Tur)", "Gram (Chana)", "Mango", "Banana", "Papaya", "Pomegranate", "Onion", "Garlic", "Potato", "Tomato", "Brinjal", "Okra", "Chilli", "Turmeric"].sort();
  const DEMO_SUPPLIERS = ["Bayer", "Syngenta", "UPL", "Corteva", "FMC", "PI Industries", "Coromandel", "IFFCO"];
  const DEMO_CHEMICALS = ["Urea", "DAP", "MOP", "SSP", "Complex Fertilizers", "Herbicides", "Insecticides", "Fungicides"];
  const DEMO_BIOS = ["Bio-Fertilizers", "Bio-Pesticides", "Mycorrhiza", "Seaweed Extract", "Amino Acids", "Humic Acid", "PGPR"];
  const DEMO_OTHERS = ["Seeds", "Micronutrients", "Tractors", "Implements", "Irrigation Equipment", "Tarpaulins"];

  // Shared Color Helpers
  const getCategoryColor = (band: string) => {
    if (band === 'Elite') return '#3730A3';
    if (band === 'A-Category') return '#166534';
    if (band === 'B-Category') return '#B45309';
    return '#991B1B';
  };

  const getCategoryBg = (band: string) => {
    if (band === 'Elite') return '#E0E7FF';
    if (band === 'A-Category') return '#DCFCE7';
    if (band === 'B-Category') return '#FEF3C7';
    return '#FEE2E2';
  };

  // --- Cascading Location Logic ---
  const [stateData, setStateData] = React.useState<any>(null);
  const [cities, setCities] = React.useState<string[]>([]);
  const [talukas, setTalukas] = React.useState<string[]>([]);
  const [villages, setVillages] = React.useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = React.useState(false);

  const selectedState = watch('state');
  const selectedCity = watch('city');
  const selectedTaluka = watch('taluka');

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!stateData || !stateData.districts) return setCities([]);
    setCities(stateData.districts.map((d: any) => d.district).sort());
  }, [stateData]);

  React.useEffect(() => {
    if (!selectedCity || !stateData || !stateData.districts) return setTalukas([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedCity);
    if (dist && dist.subDistricts) setTalukas(dist.subDistricts.map((sd: any) => sd.subDistrict).sort());
    else setTalukas([]);
  }, [selectedCity, stateData]);

  React.useEffect(() => {
    if (!selectedTaluka || !selectedCity || !stateData || !stateData.districts) return setVillages([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedCity);
    if (dist && dist.subDistricts) {
      const sub = dist.subDistricts.find((sd: any) => sd.subDistrict === selectedTaluka);
      if (sub && sub.villages) setVillages([...sub.villages].sort());
      else setVillages([]);
    } else setVillages([]);
  }, [selectedTaluka, selectedCity, stateData]);

  // Back handler
  React.useEffect(() => {
    const handleBackPress = () => {
      if (jumpBackTo) { setStep(jumpBackTo); setJumpBackTo(null); return true; }
      if (step > 1) { setStep(step - 1); return true; }
      return false; 
    };
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backSubscription.remove();
  }, [step, jumpBackTo]);

  if (showSuccess) {
    return (
      <FeedbackScreenTemplate
        iconName="check-circle" tone="success" animationType="pulse"
        title={isEditing ? "Profile Updated!" : "Profile Submitted!"}
        description={isEditing ? "The dealer profile has been successfully updated." : "The dealer has been successfully onboarded and saved to the database."}
        primaryActionLabel="Share PDF" onPrimaryAction={generatePDF} primaryActionVariant="text" primaryActionIcon="share"
        secondaryActionLabel={isEditing ? undefined : "Add Another Dealer"} onSecondaryAction={isEditing ? undefined : () => { setShowSuccess(false); form.reset(); setStep(1); }} secondaryActionIcon="person-add"
        tertiaryActionLabel="Go Home" onTertiaryAction={() => navigation.navigate("MainTabs")} tertiaryActionIcon="home"
      />
    );
  }

  return (
    <WizardFlowTemplate
      headerTitle={t(isEditing ? "Edit Dealer Profile" : "Dealer Onboarding")} 
      stepLabel={`STEP ${step} OF 9`} 
      progress01={step / 9}
      headerRight={
        <Pressable onPress={cycleLanguage} style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
          <Text style={{ fontWeight: '900', color: colors.primary, fontSize: 12 }}>{i18n.language.toUpperCase()}</Text>
        </Pressable>
      }
      onBack={() => { jumpBackTo ? (setStep(jumpBackTo), setJumpBackTo(null)) : (step > 1 ? setStep(step - 1) : navigation.goBack()); }}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {!isEditing && <View style={{ flex: 1 }}><Button label={t("Save Draft")} variant="secondary" onPress={saveDraft} disabled={isSubmitting} /></View>}
          <View style={{ flex: 1 }}>
            {step < 9 ? (
              <Button label={t(jumpBackTo ? "Return to Review" : "Next")} onPress={() => { jumpBackTo ? (setStep(jumpBackTo), setJumpBackTo(null)) : setStep(step + 1); }} disabled={!isNextEnabled} /> 
            ) : (
              <Button label={t(isEditing ? "Save Changes" : "Submit Profile")} onPress={submit} loading={isSubmitting} disabled={!isNextEnabled} />
            )}
          </View>
        </View>
      }
    >
      {step === 1 && <Step1BasicInfo form={form} cities={cities} talukas={talukas} villages={villages} loadingLoc={loadingLoc} />}
      {step === 2 && <Step2Profiling form={form} scoreData={scoreData} uploading={uploading} handleAudioUpload={handleAudioUpload} getCategoryBg={getCategoryBg} getCategoryColor={getCategoryColor} />}
      {step === 3 && <Step3Business form={form} uploading={uploading} handleUpload={handleUpload} />}
      {step === 4 && <Step4Commitments form={form} />}
      {step === 5 && <Step5Compliance form={form} />}
      {step === 6 && <Step6Documents form={form} uploading={uploading} handleUpload={handleUpload} />}
      {step === 7 && <Step7Annexures form={form} uploading={uploading} handleAudioUpload={handleAudioUpload} handleUpload={handleUpload} WEST_INDIA_CROPS={WEST_INDIA_CROPS} DEMO_SUPPLIERS={DEMO_SUPPLIERS} DEMO_CHEMICALS={DEMO_CHEMICALS} DEMO_BIOS={DEMO_BIOS} DEMO_OTHERS={DEMO_OTHERS} talukas={talukas} stateData={stateData} selectedCity={selectedCity} />}
      {step === 8 && <Step8Agreement form={form} />}
      {step === 9 && <Step9Review form={form} scoreData={scoreData} setJumpBackTo={setJumpBackTo} setStep={setStep} getCategoryColor={getCategoryColor} />}
    </WizardFlowTemplate>
  );
};