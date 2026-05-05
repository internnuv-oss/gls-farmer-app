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

export const FarmerOnboardingScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { form, step, setStep, saveDraft, submit, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, dealers, isEditing } = useFarmerOnboarding(navigation, route);
  const { control, formState: { errors } ,watch, setValue} = form;

  // Back Handler
  useEffect(() => {
    const handleBackPress = () => {
      if (step > 1) { setStep(step - 1); return true; }
      return false; 
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [step]);

  if (showSuccess) {
    return (
      <FeedbackScreenTemplate
        iconName="check-circle" tone="success" animationType="pulse"
        title={t(isEditing ? "Farmer Updated!" : "Farmer Enrolled!")}
        description={t(isEditing ? "The farmer profile has been successfully updated." : "The farmer has been successfully onboarded and linked to the GLS network.")}
        primaryActionLabel={isEditing ? t("Go Home") : t("Add Another Farmer")} 
        onPrimaryAction={() => { 
          if (isEditing) {
            navigation.navigate("MainTabs");
          } else {
            setShowSuccess(false); form.reset(); setStep(1); 
          }
        }}
        primaryActionIcon={isEditing ? "home" : "person-add"}
        secondaryActionLabel={isEditing ? undefined : t("Go Home")} 
        onSecondaryAction={isEditing ? undefined : () => navigation.navigate("MainTabs")}
        secondaryActionIcon={isEditing ? undefined : "home"}
      />
    );
  }

  return (
    <WizardFlowTemplate
      headerTitle={t(isEditing ? "Edit Farmer Profile" : "Farmer Enrolment")} 
      stepLabel={t("STEP {{current}} OF 4", { current: step })} 
      progress01={step / 4}
      onBack={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {!isEditing && <View style={{ flex: 1 }}><Button label={t("Save Draft")} variant="secondary" onPress={saveDraft} disabled={isSubmitting} /></View>}
          <View style={{ flex: 1 }}>
            {step < 4 ? (
              <Button label={t("Next")} onPress={() => setStep(step + 1)} disabled={!isNextEnabled} /> 
            ) : (
              <Button label={t(isEditing ? "Save Changes" : "Submit Profile")} onPress={submit} loading={isSubmitting} disabled={!isNextEnabled} />
            )}
          </View>
        </View>
      }
    >
      {step === 1 && (
        <Step1PersonalDetails 
          control={control} 
          errors={errors} 
          t={t} 
          watch={watch}      
          setValue={setValue} 
        />
      )}
      {step === 2 && <Step2FarmDetails control={control} errors={errors} t={t} watch={watch} />}
      {step === 3 && <Step3History control={control} errors={errors} t={t} dealers={dealers} watch={watch} />}
      {step === 4 && <Step4Signatures control={control} t={t} />}
    </WizardFlowTemplate>
  );
};