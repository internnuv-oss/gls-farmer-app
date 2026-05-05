import React from 'react';
import { View, BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../../design-system/templates';
import { Button } from '../../../../design-system/components';
import { spacing } from '../../../../design-system/tokens';
import { useDistributorOnboarding } from '../hooks';

import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Scoring } from './steps/Step2Scoring';
import { Step3Business } from './steps/Step3Business';
import { Step4Dealers } from './steps/Step4Dealers';
import { Step5Commitments } from './steps/Step5Commitments';
import { Step6Regulatory } from './steps/Step6Regulatory';
import { Step7Documents } from './steps/Step7Documents';
import { Step8Annexures } from './steps/Step8Annexures';
import { Step9Agreement } from './steps/Step9Agreement';
import { Step10Review } from './steps/Step10Review';

export const DistributorOnboardingScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  
  // 🚀 FIXED: Extracted jumpBackTo and setJumpBackTo
  const { form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess } = useDistributorOnboarding(navigation, route);

  React.useEffect(() => {
    const handleBackPress = () => {
      // 🚀 FIXED: Hardware back button handling for Jump Back
      if (jumpBackTo) {
        setStep(jumpBackTo);
        setJumpBackTo(null);
        return true;
      }
      if (step > 1) { setStep(step - 1); return true; }
      return false; 
    };
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backSubscription.remove();
  }, [step, jumpBackTo]);

  if (showSuccess) {
    return (
      <FeedbackScreenTemplate
        iconName="domain" tone="success" animationType="pulse"
        title={t("Distributor Onboarded!")}
        description={t("The distributor has been successfully added to the network.")}
        primaryActionLabel={t("Go Home")} 
        onPrimaryAction={() => navigation.navigate("MainTabs")} 
        primaryActionIcon="home"
      />
    );
  }

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return <Step1BasicInfo form={form} t={t} />;
      case 2: return <Step2Scoring form={form} scoreData={scoreData} uploading={uploading} handleAudioUpload={handleAudioUpload} t={t} />;
      case 3: return <Step3Business form={form} t={t} />;
      case 4: return <Step4Dealers form={form} uploading={uploading} handleUpload={handleUpload} t={t} />;
      case 5: return <Step5Commitments form={form} t={t} />;
      case 6: return <Step6Regulatory form={form} t={t} />;
      case 7: return <Step7Documents form={form} uploading={uploading} handleUpload={handleUpload} t={t} />;
      case 8: return <Step8Annexures form={form} uploading={uploading} handleAudioUpload={handleAudioUpload} handleUpload={handleUpload} setStep={setStep} t={t} />;
      case 9: return <Step9Agreement form={form} t={t} />;
      // 🚀 FIXED: Passed setJumpBackTo into the Review step
      case 10: return <Step10Review form={form} scoreData={scoreData} setStep={setStep} setJumpBackTo={setJumpBackTo} t={t} />;
      default: return null;
    }
  };

  return (
    <WizardFlowTemplate
      headerTitle={t("Distributor Onboarding")} 
      stepLabel={t("STEP {{current}} OF 10", { current: step })} 
      progress01={step / 10}
      onBack={() => {
        // 🚀 FIXED: Header back button handling for Jump Back
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
          <View style={{ flex: 1 }}>
            <Button label={t("Save Draft")} variant="secondary" onPress={saveDraft} disabled={isSubmitting} />
          </View>
          <View style={{ flex: 1 }}>
            {/* 🚀 FIXED: Footer Button Logic for Jump Back */}
            {jumpBackTo ? (
              <Button 
                label={t("Return to Review")} 
                onPress={() => { setStep(jumpBackTo); setJumpBackTo(null); }} 
                disabled={!isNextEnabled} 
              />
            ) : step < 10 ? (
              <Button label={t("Next")} onPress={() => setStep(step + 1)} disabled={!isNextEnabled} /> 
            ) : (
              <Button label={t("Submit Profile")} onPress={submit} loading={isSubmitting} disabled={!isNextEnabled} />
            )}
          </View>
        </View>
      }
    >
      {renderCurrentStep()}
    </WizardFlowTemplate>
  );
};