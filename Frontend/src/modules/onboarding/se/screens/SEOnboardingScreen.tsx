import React from 'react';
import { View, Text, Pressable, BackHandler, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../../design-system/templates';
import { Button } from '../../../../design-system/components';
import { colors } from '../../../../design-system/tokens';
import { useSEOnboarding } from '../hooks';

// Import our step components
import { Step1PersonalDetails } from './steps/Step1PersonalDetails';
import { Step2Organization } from './steps/Step2Organization';
import { Step3Financial } from './steps/Step3Financial';
import { Step4AssetsLogistics } from './steps/Step4AssetsLogistics';
import { Step5Documents } from './steps/Step5Documents';
import { Step6Review } from './steps/Step6Review';

export const SEOnboardingScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  
  const { form, step, setStep, jumpBackTo, setJumpBackTo, submit, handleUpload, uploading, isSubmitting, isNextEnabled, showSuccess } = useSEOnboarding(navigation);

  // Hardware back button logic
  React.useEffect(() => {
    const handleBackPress = () => {
      if (jumpBackTo) { 
        if (!isNextEnabled) {
          Alert.alert(t("Incomplete"), t("Please fill all required fields correctly before returning to the review screen."));
          return true; 
        }
        setStep(jumpBackTo); 
        setJumpBackTo(null); 
        return true; 
      }
      if (step > 1) { setStep(step - 1); return true; }
      return false; 
    };
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backSubscription.remove();
  }, [step, jumpBackTo, isNextEnabled]);

  if (showSuccess) {
    return (
      <FeedbackScreenTemplate
        iconName="check-circle" tone="success" animationType="pulse"
        title={t("Profile Complete!")}
        description={t("Your Sales Executive profile has been successfully saved. You can now start onboarding your network.")}
        primaryActionLabel={t("Go to Dashboard")}
        onPrimaryAction={() => navigation.navigate("MainTabs")}
        primaryActionIcon="dashboard"
      />
    );
  }

  const renderEditBtn = (targetStep: number) => (
    <Pressable onPress={() => { setJumpBackTo(6); setStep(targetStep); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialIcons name="edit" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Edit")}</Text>
    </Pressable>
  );

  return (
    <WizardFlowTemplate
      headerTitle={t("Complete Your Profile")} 
      stepLabel={t("STEP {{current}} OF {{total}}", { current: step, total: 6 })} 
      // 🚀 The prop below triggers the scroll reset in Templates.tsx
      progress01={step / 6}
      onBack={() => {
        if (jumpBackTo) { 
          if (!isNextEnabled) {
            Alert.alert(t("Incomplete"), t("Please fill all required fields correctly before returning to the review screen."));
            return; 
          }
          setStep(jumpBackTo); 
          setJumpBackTo(null); 
        } 
        else { step > 1 ? setStep(step - 1) : navigation.goBack(); }
      }}
      footer={
        <View style={{ flex: 1 }}>
          {step < 6 ? (
            <Button 
              label={t(jumpBackTo ? "Return to Review" : "Next")} 
              onPress={() => { jumpBackTo ? (setStep(jumpBackTo), setJumpBackTo(null)) : setStep(step + 1); }} 
              disabled={!isNextEnabled} 
            /> 
          ) : (
            <Button label={t("Complete Onboarding")} onPress={submit} loading={isSubmitting} disabled={!isNextEnabled} />
          )}
        </View>
      }
    >
      {step === 1 && <Step1PersonalDetails form={form} />}
      {step === 2 && <Step2Organization form={form} />}
      {step === 3 && <Step3Financial form={form} />}
      {step === 4 && <Step4AssetsLogistics form={form} />}
      {step === 5 && <Step5Documents form={form} uploading={uploading} handleUpload={handleUpload} />}
      {step === 6 && <Step6Review form={form} renderEditBtn={renderEditBtn} />}
    </WizardFlowTemplate>
  );
};