import React from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../../design-system/templates';
import { Button } from '../../../../design-system/components';
import { colors, spacing } from '../../../../design-system/tokens';
import { useSEOnboarding } from '../hooks';
import { useAlertStore } from '../../../../store/alertStore';

// 🚀 Import all 7 steps (ensure Step5Insurances exists in the same folder!)
import { Step1PersonalDetails } from './steps/Step1PersonalDetails';
import { Step2Organization } from './steps/Step2Organization';
import { Step3Financial } from './steps/Step3Financial';
import { Step4AssetsLogistics } from './steps/Step4AssetsLogistics';
import { Step5Insurances } from './steps/Step5Insurances';
import { Step6Documents } from './steps/Step6Documents';
import { Step7Review } from './steps/Step7Review';

export const SEOnboardingScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  
  const { form, step, setStep, jumpBackTo, setJumpBackTo, submit, handleUpload, uploading, isSubmitting, isNextEnabled, showSuccess, saveAndExit, isEditing } = useSEOnboarding(navigation);

  const { control, formState: { errors }, watch, setValue } = form;

  // Hardware back button logic
  React.useEffect(() => {
    const handleBackPress = () => {
      if (jumpBackTo) { 
        if (!isNextEnabled) {
          useAlertStore.getState().showAlert(t("Incomplete"), t("Please fill all required fields correctly before returning to the review screen."));
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
        description={t("Your Sales Executive profile has been successfully saved.")}
        primaryActionLabel={t("Go to Profile")}
        onPrimaryAction={() => navigation.navigate("MainTabs", { screen: "Profile" })}
        primaryActionIcon="person"
      />
    );
  }

  // 🚀 Jump back specifically to Step 7 now
  const renderEditBtn = (targetStep: number) => (
    <Pressable onPress={() => { setJumpBackTo(7); setStep(targetStep); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialIcons name="edit" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Edit")}</Text>
    </Pressable>
  );

  return (
    <WizardFlowTemplate
      headerTitle={t("Complete Your Profile")} 
      // 🚀 Out of 7 steps
      stepLabel={t("STEP {{current}} OF {{total}}", { current: step, total: 7 })} 
      progress01={step / 7}
      onBack={() => {
        if (jumpBackTo) { 
          if (!isNextEnabled) {
            useAlertStore.getState().showAlert(t("Incomplete"), t("Please fill all required fields correctly before returning to the review screen."));
            return; 
          }
          setStep(jumpBackTo); 
          setJumpBackTo(null); 
        } 
        else { step > 1 ? setStep(step - 1) : navigation.goBack(); }
      }}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          
          {!isEditing && (
            <View style={{ flex: 1 }}>
              <Button 
                label={t("Save & Exit")} 
                variant="secondary" 
                onPress={saveAndExit} 
                disabled={isSubmitting} 
              />
            </View>
          )}

          {/* 🚀 Changed bounds to 7 */}
          <View style={{ flex: 1 }}>
            {step < 7 ? (
              <Button 
                label={t(jumpBackTo ? "Return to Review" : "Next")} 
                onPress={() => { jumpBackTo ? (setStep(jumpBackTo), setJumpBackTo(null)) : setStep(step + 1); }} 
                disabled={!isNextEnabled} 
              />
            ) : (
              <Button 
                label={t("Complete")} 
                onPress={submit} 
                loading={isSubmitting} 
                disabled={!isNextEnabled} 
              />
            )}
          </View>
          
        </View>
      }
    >
      {/* 🚀 Map all 7 steps down properly */}
      {step === 1 && <Step1PersonalDetails form={form} />}
      {step === 2 && <Step2Organization form={form} />}
      {step === 3 && <Step3Financial form={form} />}
      {step === 4 && <Step4AssetsLogistics form={form} />}
      {step === 5 && <Step5Insurances control={control} errors={errors} t={t} watch={watch} setValue={setValue} uploading={uploading} handleUpload={handleUpload} />}
      {step === 6 && <Step6Documents form={form} uploading={uploading} handleUpload={handleUpload} />}
      {step === 7 && <Step7Review form={form} renderEditBtn={renderEditBtn} />}
    </WizardFlowTemplate>
  );
};