// Frontend/src/modules/onboarding/fpo/screens/FPOOnboardingScreen.tsx
import React from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../core/i18n';
import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../../design-system/templates';
import { Button } from '../../../../design-system/components';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { useFPOOnboarding } from '../hooks';

// We will build these steps next
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Profiling } from './steps/Step2Profiling';
import { Step3Business } from './steps/Step3Business';
import { Step4Network } from './steps/Step4Network';
import { Step5Commitments } from './steps/Step5Commitments';
import { Step6Regulatory } from './steps/Step6Regulatory';
import { Step7Documents } from './steps/Step7Documents';
import { Step8Agreement } from './steps/Step8Agreement';
import { Step9Review } from './steps/Step9Review';

export const FPOOnboardingScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const cycleLanguage = () => {
    const next = i18n.language === 'en' ? 'hi' : i18n.language === 'hi' ? 'gu' : 'en';
    i18n.changeLanguage(next);
  };
  
  const { form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, generatePDF, isEditing, isLocked } = useFPOOnboarding(navigation, route);

  React.useEffect(() => {
    const handleBackPress = () => {
      if (jumpBackTo) { setStep(jumpBackTo); setJumpBackTo(null); return true; }
      if (step > 1) { setStep(step - 1); return true; }
      return false; 
    };
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backSubscription.remove();
  }, [step, jumpBackTo]);

  if (showSuccess) return (
    <FeedbackScreenTemplate iconName="check-circle" tone="success" animationType="pulse" title={t("FPO Onboarded!")} description={t("The FPO profile has been successfully saved.")} primaryActionLabel={t("Share PDF")} onPrimaryAction={generatePDF} primaryActionVariant="text" primaryActionIcon="share" secondaryActionLabel={t("Add Another FPO")} onSecondaryAction={() => { setShowSuccess(false); form.reset(); setStep(1); }} secondaryActionIcon="domain-add" tertiaryActionLabel={t("Go Home")} onTertiaryAction={() => navigation.navigate("MainTabs")} tertiaryActionIcon="home" />
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return <Step1BasicInfo form={form} t={t} isLocked={isLocked} />;
      case 2: return <Step2Profiling form={form} scoreData={scoreData} uploading={uploading} handleAudioUpload={handleAudioUpload} t={t} />;
      case 3: return <Step3Business form={form} t={t} />;
      case 4: return <Step4Network form={form} t={t} />;
      case 5: return <Step5Commitments form={form} t={t} isLocked={isLocked} />;
      case 6: return <Step6Regulatory form={form} t={t} isLocked={isLocked} />;
      case 7: return <Step7Documents form={form} uploading={uploading} handleUpload={handleUpload} t={t} isLocked={isLocked} />;
      case 8: return <Step8Agreement form={form} t={t} isLocked={isLocked} />;
      case 9: return <Step9Review form={form} scoreData={scoreData} setStep={setStep} setJumpBackTo={setJumpBackTo} t={t} />;
      default: return null;
    }
  };

  return (
    <WizardFlowTemplate
      headerTitle={t(isEditing ? "Edit FPO" : "FPO Onboarding")} 
      stepLabel={t("STEP {{current}} OF 9", { current: step })} 
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
            {jumpBackTo ? <Button label={t("Return to Review")} onPress={() => { setStep(jumpBackTo); setJumpBackTo(null); }} disabled={!isNextEnabled} /> 
            : step < 9 ? <Button label={t("Next")} onPress={() => setStep(step + 1)} disabled={!isNextEnabled} /> 
            : <Button label={t(isEditing ? "Save Changes" : "Submit Profile")} onPress={submit} loading={isSubmitting} disabled={!isNextEnabled} />}
          </View>
        </View>
      }
    >
      {renderCurrentStep()}
    </WizardFlowTemplate>
  );
};