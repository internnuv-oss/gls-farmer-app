// src/modules/FarmCard/screens/FarmCardOnboardingScreen.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../../core/i18n';
import { WizardFlowTemplate } from '../../../design-system/templates';
import { Button } from '../../../design-system/components';
import { spacing, colors, radius } from '../../../design-system/tokens';
import { useFarmCardOnboarding } from '../hooks';

import { Step1FarmerProfile } from './steps/Step1FarmerProfile';
import { Step2LandAndWater } from './steps/Step2LandAndWater';
import { Step3SoilAndHistory } from './steps/Step3SoilAndHistory';
import { Step4InfraAndLivestock } from './steps/Step4InfraAndLivestock';
import { Step5MediaAndDigital } from './steps/Step5MediaAndDigital';
import { Step6Review } from './steps/Step6Review'; 

export const FarmCardOnboardingScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { form, step, setStep, jumpBackTo, setJumpBackTo, submit, saveDraft, handleCameraUpload, handleBoundaryCapture, uploading, isSubmitting, isDirty, isSavingDraft } = useFarmCardOnboarding(navigation, route);

  // 🚀 Added Language Switcher Logic
  const cycleLanguage = () => {
    const next = i18n.language === 'en' ? 'hi' : i18n.language === 'hi' ? 'gu' : 'en';
    i18n.changeLanguage(next);
  };

  const renderStep = () => {
    switch(step) {
      case 1: return <Step1FarmerProfile form={form} t={t} />;
      case 2: return <Step2LandAndWater form={form} t={t} />;
      case 3: return <Step3SoilAndHistory form={form} t={t} />;
      case 4: return <Step4InfraAndLivestock form={form} t={t} />;
      case 5: return <Step5MediaAndDigital form={form} t={t} handleCameraUpload={handleCameraUpload} handleBoundaryCapture={handleBoundaryCapture} uploading={uploading} />;
      case 6: return <Step6Review form={form} setStep={setStep} setJumpBackTo={setJumpBackTo} t={t} />;
      default: return null;
    }
  };

  return (
    <WizardFlowTemplate
      headerTitle={t("Farm Card")} 
      stepLabel={t(`STEP ${step} OF 6`)} 
      progress01={step / 6}
      
      // 🚀 Injected Language Button
      headerRight={
        <Pressable onPress={cycleLanguage} style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
          <Text style={{ fontWeight: '900', color: colors.primary, fontSize: 12 }}>{i18n.language.toUpperCase()}</Text>
        </Pressable>
      }

      onBack={() => {
        if (jumpBackTo) { setStep(jumpBackTo); setJumpBackTo(null); }
        else { step > 1 ? setStep(step - 1) : navigation.goBack(); }
      }}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          
          {/* 🚀 NEW: Save Draft Button */}
          <View style={{ flex: 1 }}>
             <Button 
               label={t("Save Draft")} 
               variant="secondary" 
               onPress={saveDraft} 
               disabled={isSubmitting || !isDirty} // 🚀 Disables if no changes were made
               loading={isSavingDraft}
             />
          </View>

          {/* Existing Next / Lock Baseline Button */}
          <View style={{ flex: 1 }}>
            {jumpBackTo ? (
              <Button label={t("Return to Review")} onPress={() => { setStep(jumpBackTo); setJumpBackTo(null); }} />
            ) : step < 6 ? (
              <Button label={t("Next")} onPress={() => setStep(step + 1)} /> 
            ) : (
              <Button label={t("Submit")} onPress={submit} loading={isSubmitting} />
            )}
          </View>

        </View>
      }
    >
      {renderStep()}
    </WizardFlowTemplate>
  );
};