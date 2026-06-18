// Frontend/src/modules/onboarding/fpo/screens/steps/Step7Documents.tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { UseFormReturn } from 'react-hook-form';
import { UploadTile } from '../../../../../design-system/components';
import { spacing, colors, radius, shadows } from '../../../../../design-system/tokens';
import { FPOOnboardingValues } from '../../schema';

// --- SHARED TYPES ---
interface Props {
  form: UseFormReturn<FPOOnboardingValues>;
  uploading: Record<string, boolean>;
  handleUpload: (key: string, source: 'camera' | 'doc') => Promise<void>;
  t: any;
  isLocked?: boolean; // 🚀 FIX: Added isLocked
}

interface SectionProps {
  docs: Record<string, any>;
  uploading: Record<string, boolean>;
  handleUpload: (key: string, source: 'camera' | 'doc') => Promise<void>;
  clearDoc: (key: string) => void;
  t: any;
}

// --- REUSABLE UPLOAD ROW COMPONENT ---
const DocumentUploadRow = ({ label, docKey, docs, uploading, handleUpload, clearDoc, t }: SectionProps & { label: string, docKey: string }) => (
  <View style={{ marginBottom: spacing.md }}>
    <Text style={{ marginBottom: 4, fontWeight: '600' }}>{t(label)}</Text>
    <UploadTile
      value={docs[docKey]}
      loading={uploading[docKey]}
      onUpload={(src) => handleUpload(docKey, src)}
      onClear={() => clearDoc(docKey)}
    />
  </View>
);

// --- MODULAR SECTIONS AS CARDS ---
const CoreRegistrationSection = (props: SectionProps) => (
  <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
    <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16, marginBottom: spacing.md }}>{props.t("Core Registration & Licenses")}</Text>
    <DocumentUploadRow {...props} label="Incorporation Cert (ROC / Coop) *" docKey="incorporation_certificate" />
    <DocumentUploadRow {...props} label="Valid FCO / Fertilizer License *" docKey="fco_license" />
    <DocumentUploadRow {...props} label="Insecticide Selling License" docKey="insecticide_license" />
  </View>
);

const FinancialsSection = (props: SectionProps) => (
  <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
    <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16, marginBottom: spacing.md }}>{props.t("Financials & Compliance")}</Text>
    <DocumentUploadRow {...props} label="PAN Card *" docKey="pan_card" />
    <DocumentUploadRow {...props} label="GST Cert" docKey="gst_certificate" />
    <DocumentUploadRow {...props} label="Cancelled Cheque *" docKey="cancelled_cheque" />
    <DocumentUploadRow {...props} label="Board Resolution *" docKey="board_resolution" />
    <DocumentUploadRow {...props} label="Audited Balance Sheet (2 Yrs)" docKey="balance_sheet" />
  </View>
);

const SelectedComplianceSection = (props: SectionProps & { complianceItems: string[] }) => {
  if (!props.complianceItems || props.complianceItems.length === 0) return null;
  return (
    <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
      <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16, marginBottom: spacing.md }}>{props.t("Selected Compliance Documents")}</Text>
      {props.complianceItems.map((item: string, idx: number) => {
        const key = item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        return <DocumentUploadRow key={idx} {...props} label={item} docKey={key} />;
      })}
    </View>
  );
};

const InfrastructureSection = (props: SectionProps) => (
  <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
    <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16, marginBottom: spacing.md }}>{props.t("Infrastructure Photos (GPS Tagged)")}</Text>
    <DocumentUploadRow {...props} label="Storage Facility - Exterior *" docKey="storage_exterior" />
    <DocumentUploadRow {...props} label="Storage Facility - Interior *" docKey="storage_interior" />
  </View>
);

// --- MAIN EXPORTED COMPONENT ---
export const Step7Documents = ({ form, uploading, handleUpload, t, isLocked }: Props) => {
  const { watch, setValue } = form;
  const docs = watch('documents') || {};
  const complianceItems = watch('complianceChecklist') || [];

  const clearDoc = (key: string) => {
    const updatedDocs = { ...docs };
    delete updatedDocs[key];
    setValue('documents', updatedDocs, { shouldValidate: true });
  };

  const sectionProps = { docs, uploading, handleUpload, clearDoc, t };

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      keyboardShouldPersistTaps="handled" // 🚀 FIX: Prevents ScrollView from swallowing button taps
      pointerEvents={isLocked ? "none" : "auto"} // 🚀 FIX: Locks the screen if profile is already submitted
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Upload Documents")}</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg }}>
        {t("Provide clear copies of the regulatory documents mapped in the previous step.")}
      </Text>

      <CoreRegistrationSection {...sectionProps} />
      <FinancialsSection {...sectionProps} />
      <SelectedComplianceSection {...sectionProps} complianceItems={complianceItems} />
      <InfrastructureSection {...sectionProps} />
      
    </ScrollView>
  );
};