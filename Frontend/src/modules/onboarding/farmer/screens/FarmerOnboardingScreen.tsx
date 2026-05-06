import React, { useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../../design-system/templates';
import { Button } from '../../../../design-system/components';
import { spacing } from '../../../../design-system/tokens';
import { useFarmerOnboarding } from '../hooks';

// Import Steps
import { Step1PersonalDetails } from './steps/Step1PersonalDetails';
import { Step2FarmDetails } from './steps/Step2FarmDetails';
import { Step3History } from './steps/Step3History';
import { Step4Signatures } from './steps/Step4Signatures';
import { Step5Review } from './steps/Step5Review'; // 🚀 ADDED

export const FarmerOnboardingScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  
  const { 
    form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, isSubmitting, 
    isNextEnabled, showSuccess, setShowSuccess, dealers, 
    isEditing, generatePDF 
  } = useFarmerOnboarding(navigation, route);
  
  const { control, formState: { errors } ,watch, setValue} = form;

  // Back Handler
  useEffect(() => {
    const handleBackPress = () => {
      if (jumpBackTo) {
        setStep(jumpBackTo);
        setJumpBackTo(null);
        return true;
      }
      if (step > 1) { setStep(step - 1); return true; }
      return false; 
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [step, jumpBackTo]);

  // 🚀 UPDATED: Unified Success Screen exactly like Dealer
  if (showSuccess) {
    return (
      <FeedbackScreenTemplate
        iconName="check-circle" 
        tone="success" 
        animationType="pulse"
        title={t(isEditing ? "Farmer Updated!" : "Farmer Enrolled!")}
        description={t(isEditing ? "The farmer profile has been successfully updated." : "The farmer has been successfully onboarded and linked to the GLS network.")}
        
        primaryActionLabel={t("Share PDF")} 
        onPrimaryAction={generatePDF} 
        primaryActionVariant="text" 
        primaryActionIcon="share"
        
        secondaryActionLabel={t("Add Another Farmer")} 
        onSecondaryAction={() => { setShowSuccess(false); form.reset(); setStep(1); }} 
        secondaryActionIcon="person-add"
        
        tertiaryActionLabel={t("Go Home")} 
        onTertiaryAction={() => navigation.navigate("MainTabs")} 
        tertiaryActionIcon="home"
      />
    );
  }

  return (
    <WizardFlowTemplate
      headerTitle={t(isEditing ? "Edit Farmer Profile" : "Farmer Enrolment")} 
      stepLabel={t("STEP {{current}} OF 5", { current: step })} 
      progress01={step / 5}
      onBack={() => {
        if (jumpBackTo) {
          setStep(jumpBackTo);
          setJumpBackTo(null);
        } else if (step > 1) {
          setStep(step - 1);
        } else {
          navigation.goBack();
        }
      }}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {!isEditing && <View style={{ flex: 1 }}><Button label={t("Save Draft")} variant="secondary" onPress={saveDraft} disabled={isSubmitting} /></View>}
          <View style={{ flex: 1 }}>
            {jumpBackTo ? (
              <Button 
                label={t("Return to Review")} 
                onPress={() => { setStep(jumpBackTo); setJumpBackTo(null); }} 
                disabled={!isNextEnabled} 
              />
            ) : step < 5 ? (
              <Button label={t("Next")} onPress={() => setStep(step + 1)} disabled={!isNextEnabled} /> 
            ) : (
              <Button label={t(isEditing ? "Save Changes" : "Submit Profile")} onPress={submit} loading={isSubmitting} disabled={!isNextEnabled} />
            )}
          </View>
        </View>
      }
    >
      {step === 1 && <Step1PersonalDetails control={control} errors={errors} t={t} watch={watch} setValue={setValue} />}
      {step === 2 && <Step2FarmDetails control={control} errors={errors} t={t} watch={watch} />}
      {step === 3 && <Step3History control={control} errors={errors} t={t} dealers={dealers} watch={watch} />}
      {step === 4 && <Step4Signatures control={control} t={t} />}
      {/* 🚀 ADDED: The new review screen */}
      {step === 5 && <Step5Review form={form} setStep={setStep} setJumpBackTo={setJumpBackTo} dealers={dealers} t={t} />}
    </WizardFlowTemplate>
  );
};