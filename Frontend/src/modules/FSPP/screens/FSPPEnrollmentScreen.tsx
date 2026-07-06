import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WizardFlowTemplate, FeedbackScreenTemplate } from '../../../design-system/templates';
import { Button } from '../../../design-system/components';
import { colors, radius, spacing } from '../../../design-system/tokens';
import { useFSPPEnrollment } from '../hooks';
import { Step1Land } from './steps/Step1Land';
import { Step2Awareness } from './steps/Step2Awareness';
import { Step3Mindset } from './steps/Step3Mindset';

export const FSPPEnrollmentScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { form, step, setStep, isNextEnabled, isSubmitEnabled, isSubmitting, submit, showSuccess, setShowSuccess, calculateScore, totalLand, isCompleted } = useFSPPEnrollment(navigation, route);

  if (showSuccess) {
    const result = calculateScore();
    const isKO = result.isKnockout;
    const tone = isKO ? "danger" : result.category === 'Category A' ? "success" : result.category === 'Category B' ? "warning" : "danger";
    const bg = isKO ? '#FEE2E2' : result.category === 'Category A' ? '#DCFCE7' : result.category === 'Category B' ? '#FEF3C7' : '#FEE2E2';
    const textCol = isKO ? '#991B1B' : result.category === 'Category A' ? '#166534' : result.category === 'Category B' ? '#B45309' : '#991B1B';

    return (
      <FeedbackScreenTemplate
        iconName={isKO ? 'block' : 'verified-user'}
        tone={tone}
        animationType="pulse"
        title="Assessment Complete!"
        description={`The FSPP enrollment assessment has been recorded.\n\nFINAL RESULT: ${result.score} / 100\n${result.status}`}
        primaryActionLabel="Return to Profile"
        onPrimaryAction={() => navigation.goBack()}
        primaryActionIcon="arrow-back"
      />
    );
  }

  // Final Review Step inline
  const renderReview = () => {
    const result = calculateScore();
    const isKO = result.isKnockout;
    const vals = form.getValues();
    const missing = [];
    if (!vals.committedLand) missing.push("1. Committed Land");
    if (!vals.seasonalExpense) missing.push("2. Seasonal Expenditure");
    if (!vals.bioAwareness) missing.push("3. Prior Awareness of Biologicals");
    if (!vals.glsKnowledge) missing.push("4. Prior Knowledge of GLS");
    if (!vals.mindsetA || !vals.mindsetB || !vals.mindsetC || !vals.mindsetD) missing.push("5. Mindset Assessment (some questions unanswered)");

    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: spacing.md }}>{t("Review Evaluation")}</Text>
        {isKO && (
          <View style={{ backgroundColor: '#FEF2F2', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', marginBottom: spacing.md }}>
            <Text style={{ color: '#991B1B', fontWeight: '800', textAlign: 'center' }}>{t("KNOCK-OUT CRITERIA FAILED")}</Text>
            <Text style={{ color: '#991B1B', textAlign: 'center', marginTop: 4 }}>{t("Land holding or committed land is less than 1 acre. Farmer is automatically disqualified.")}</Text>
          </View>
        )}
        <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '700' }}>{t("COMPUTED SCORE")}</Text>
          <Text style={{ fontSize: 48, fontWeight: '900', color: isKO ? colors.danger : colors.primary }}>{result.score}</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.sm, textAlign: 'center' }}>{result.status}</Text>
        </View>

        {missing.length > 0 && (
          <View style={{ backgroundColor: '#FFFBEB', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#FEF3C7', marginTop: spacing.lg }}>
            <Text style={{ color: '#B45309', fontWeight: '800', marginBottom: spacing.sm, fontSize: 14 }}>{t("Incomplete Fields (Required before Submit):")}</Text>
            {missing.map((m, i) => (
              <Text key={i} style={{ color: '#D97706', fontSize: 13, marginBottom: 2, fontWeight: '500' }}>• {m}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <WizardFlowTemplate
      headerTitle="FSPP Enrollment"
      stepLabel={`STEP ${step} OF 4`}
      progress01={step / 4}
      onBack={() => { step > 1 ? setStep(step - 1) : navigation.goBack(); }}
      footer={
        <View>
          {step < 4 ? (
            <Button label="Next" onPress={() => setStep(step + 1)} disabled={!isNextEnabled && !isCompleted} />
          ) : isCompleted ? (
            <Button label="Close" onPress={() => navigation.goBack()} />
          ) : (
            <Button label="Submit Assessment" onPress={submit} loading={isSubmitting} disabled={!isSubmitEnabled} />
          )}
        </View>
      }
    >
      <View style={{ flex: 1 }} pointerEvents={isCompleted ? 'none' : 'auto'}>
        {step === 1 && <Step1Land form={form} totalLand={totalLand} />}
        {step === 2 && <Step2Awareness form={form} />}
        {step === 3 && <Step3Mindset form={form} />}
        {step === 4 && renderReview()}
      </View>
    </WizardFlowTemplate>
  );
};
