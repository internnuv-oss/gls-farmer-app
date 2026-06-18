// Frontend/src/modules/onboarding/fpo/screens/steps/Step2Profiling.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScoreSlider, TextArea, AudioRecorder } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { FPOOnboardingValues } from '../../schema';

const SCORING_ASPECTS = [
  { key: 'scoreMemberBase', rem: 'remMemberBase', aud: 'audioMemberBase', label: '1. Member Base & Reach', params: 'Total registered farmer members (Target: ≥500), active transacting members, percentage of small/marginal farmers.' },
  { key: 'scoreFinancial', rem: 'remFinancial', aud: 'audioFinancial', label: '2. Financial Health & Equity', params: 'Paid-up equity capital, grants received, annual turnover (last 2 years), availability of working capital or cash credit limits.' },
  { key: 'scoreGovernance', rem: 'remGovernance', aud: 'audioGovernance', label: '3. Governance & Mgmt', params: 'Active BoD, presence of a qualified professional CEO, regularity of Board meetings and AGMs, clear record-keeping.' },
  { key: 'scoreInfra', rem: 'remInfra', aud: 'audioInfra', label: '4. Infrastructure Capabilities', params: 'Custom Hiring Centre (CHC), input shop ownership, warehouse storage capacity, sorting/grading facilities, cold storage if any.' },
  { key: 'scoreDistribution', rem: 'remDistribution', aud: 'audioDistribution', label: '5. Input Distribution Exp', params: 'Prior experience retailing fertilizers/seeds, current monthly/seasonal input sales volume, credit terms with existing suppliers.' },
  { key: 'scoreAggregation', rem: 'remAggregation', aud: 'audioAggregation', label: '6. Output Aggregation', params: 'Total volume of crop aggregated annually, major buyers/off-takers, value-addition processing capabilities.' },
  { key: 'scoreBiologicals', rem: 'remBiologicals', aud: 'audioBiologicals', label: '7. Adoption of Biologicals', params: 'Awareness level of bio-fertilizers/biopesticides among members, past organic/bio input trials, openness to GLS products.' },
  { key: 'scoreExtension', rem: 'remExtension', aud: 'audioExtension', label: '8. Extension & Field Reach', params: 'Presence of Local Resource Persons (LRPs) or Krishi Mitras, capacity to hold farmer field days and product demonstrations.' },
  { key: 'scoreDigital', rem: 'remDigital', aud: 'audioDigital', label: '9. Digital Literacy', params: 'FPO management software usage, active WhatsApp groups with members, digital payment acceptance among farmers.' },
  { key: 'scoreAlignment', rem: 'remAlignment', aud: 'audioAlignment', label: '10. Strategic Alignment', params: 'Willingness to adopt the GLS Farm Card + Calendar model and strictly promote registered, high-quality biologicals.' },
];

const getDynamicTableData = (key: string, score: number) => {
  if (key === 'scoreMemberBase') {
    const headers = ["Active Farmer Base", "Activity Level"];
    if (score <= 2) return { headers, row: ["< 100 members", "Paper-only FPO; minimal transacting farmers."] };
    if (score <= 4) return { headers, row: ["100 - 250 members", "Small base; occasional seasonal transactions."] };
    if (score <= 6) return { headers, row: ["250 - 500 members", "Moderate reach; stable core of transacting members."] };
    if (score <= 8) return { headers, row: ["500 - 1000 members", "Strong base; high % of active small/marginal farmers."] };
    return { headers, row: ["> 1000 members", "Massive reach; deeply integrated into member livelihoods."] };
  }
  if (key === 'scoreFinancial') {
    const headers = ["Financial Status", "Working Capital / Credit"];
    if (score <= 2) return { headers, row: ["Poor Equity", "No working capital; dependent entirely on ad-hoc grants."] };
    if (score <= 4) return { headers, row: ["Basic Stability", "Minimal turnover; struggles with cash flow for inputs."] };
    if (score <= 6) return { headers, row: ["Stable Turnover", "Active cash credit limits; regular financial audits."] };
    if (score <= 8) return { headers, row: ["Strong Financials", "Consistent turnover growth; good self-funded working capital."] };
    return { headers, row: ["Highly Profitable", "Large capital reserves; high creditworthiness with banks/MNCs."] };
  }
  if (key === 'scoreGovernance') {
    const headers = ["Leadership", "Compliance & Records"];
    if (score <= 2) return { headers, row: ["Inactive BoD", "No professional CEO; poor/missing record-keeping."] };
    if (score <= 4) return { headers, row: ["Basic Mgmt", "Part-time or volunteer CEO; irregular AGMs."] };
    if (score <= 6) return { headers, row: ["Active BoD", "Full-time CEO present; compliant with ROC/Act regulations."] };
    if (score <= 8) return { headers, row: ["Professional", "Qualified CEO; regular board meetings; transparent records."] };
    return { headers, row: ["Exceptional", "Tech-driven governance; highly transparent and democratic."] };
  }
  if (key === 'scoreInfra') {
    const headers = ["Storage & Processing", "Machinery (CHC)"];
    if (score <= 2) return { headers, row: ["No physical office", "Zero storage capacity; no machinery owned."] };
    if (score <= 4) return { headers, row: ["Rented small office", "Minimal temporary storage; relies on rented equipment."] };
    if (score <= 6) return { headers, row: ["Owned/Leased Godown", "Basic warehouse space; small active Custom Hiring Centre."] };
    if (score <= 8) return { headers, row: ["Large Warehouse", "Input shop + large storage; well-equipped CHC."] };
    return { headers, row: ["Advanced Setup", "Processing/grading unit; cold storage; massive CHC fleet."] };
  }
  if (key === 'scoreDistribution') {
    const headers = ["Input Retail Experience", "Supplier Relations"];
    if (score <= 2) return { headers, row: ["No Experience", "Never sold fertilizers/seeds to members before."] };
    if (score <= 4) return { headers, row: ["Occasional Bulk", "Ad-hoc seasonal buying; no structured retail shop."] };
    if (score <= 6) return { headers, row: ["Active Input Shop", "Standard sales volume; cash-and-carry relationship with suppliers."] };
    if (score <= 8) return { headers, row: ["High Volume", "Strong seasonal sales; good credit terms with major brands."] };
    return { headers, row: ["Market Leader", "Dominates local input supply; massive turnover in agrochemicals/seeds."] };
  }
  if (key === 'scoreAggregation') {
    const headers = ["Output Aggregation", "Market Linkages"];
    if (score <= 2) return { headers, row: ["Zero Aggregation", "Members sell individually to local traders/middlemen."] };
    if (score <= 4) return { headers, row: ["Ad-hoc Collection", "Only aggregates during peak harvest; sells to local mandi."] };
    if (score <= 6) return { headers, row: ["Regular Seasonal", "Structured collection points; tie-ups with regional buyers."] };
    if (score <= 8) return { headers, row: ["Institutional Sales", "Direct contracts with large processors/corporates (e.g., ITC, Adani)."] };
    return { headers, row: ["Value Addition", "Sorts, grades, or processes crop before selling; export quality."] };
  }
  if (key === 'scoreBiologicals') {
    const headers = ["Bio-Input Awareness", "Openness to GLS"];
    if (score <= 2) return { headers, row: ["100% Chemical", "Zero awareness of biologicals; skeptical of organic claims."] };
    if (score <= 4) return { headers, row: ["Skeptical", "Tried poor quality bio previously; hesitant to push to members."] };
    if (score <= 6) return { headers, row: ["Open to Trials", "Basic awareness; willing to conduct small-scale bio demonstrations."] };
    if (score <= 8) return { headers, row: ["Proactive Adopters", "Actively promotes bio-fertilizers; strong interest in GLS range."] };
    return { headers, row: ["Core Focus", "Residue-free/organic farming is a primary mission for the FPO."] };
  }
  if (key === 'scoreExtension') {
    const headers = ["Field Staff (LRPs)", "Farmer Engagement"];
    if (score <= 2) return { headers, row: ["No Field Staff", "Zero capacity to hold field days or guide farmers."] };
    if (score <= 4) return { headers, row: ["Relies on Govt", "Sporadic meetings; depends entirely on external extension workers."] };
    if (score <= 6) return { headers, row: ["Basic Network", "Few active Krishi Mitras; can organize standard field days."] };
    if (score <= 8) return { headers, row: ["Strong LRP Force", "Dedicated coordinators per village cluster; regular method demos."] };
    return { headers, row: ["Highly Structured", "Extensive LRP network; operates dedicated validation/demo plots."] };
  }
  if (key === 'scoreDigital') {
    const headers = ["Internal Operations", "Member Connectivity"];
    if (score <= 2) return { headers, row: ["Paper-based", "Manual ledgers; low smartphone usage among leadership."] };
    if (score <= 4) return { headers, row: ["Basic Messaging", "Uses WhatsApp groups for info; manual accounting."] };
    if (score <= 6) return { headers, row: ["Standard Software", "Uses Tally/Accounting software; active digital payments (UPI)."] };
    if (score <= 8) return { headers, row: ["Dedicated FPO ERP", "Uses FPO mgmt software; strong digital tracking of members."] };
    return { headers, row: ["Advanced Tech", "Uses smart agriculture/advisory apps; full data digitization."] };
  }
  if (key === 'scoreAlignment') {
    const headers = ["Partnership Vision", "Commitment to Strategy"];
    if (score <= 2) return { headers, row: ["Misaligned", "Only wants cheap generic products; refuses GLS strategy."] };
    if (score <= 4) return { headers, row: ["Mild Interest", "Wants to start very small; reluctant to share member data."] };
    if (score <= 6) return { headers, row: ["Ready to Pilot", "Agrees to deploy Farm Card + Calendar in select village clusters."] };
    if (score <= 8) return { headers, row: ["Highly Aligned", "Commits to required demo farmers and exclusively promotes packages."] };
    return { headers, row: ["Anchor Partner", "Fully integrates GLS strategy into their core operational model."] };
  }
  return { headers: ["Evaluation Parameter", "Score Implication"], row: ["Standard Assessment", "Score determines overall profile capability."] };
};

interface Props {
  form: UseFormReturn<FPOOnboardingValues>;
  scoreData: { raw: number, band: string };
  uploading: Record<string, boolean>;
  handleAudioUpload: (key: string, uri: string) => void;
  t: any;
}

export const Step2Profiling = ({ form, scoreData, uploading, handleAudioUpload, t }: Props) => {
  const { control, watch, setValue } = form;

  // Local helper for FPO specific bands (Green, Yellow, Red)
  const getCategoryBg = (band: string) => {
    if (band?.includes('Red')) return '#FEE2E2';
    if (band?.includes('Yellow')) return '#FEF3C7';
    return '#DCFCE7';
  };
  const getCategoryColor = (band: string) => {
    if (band?.includes('Red')) return colors.danger;
    if (band?.includes('Yellow')) return '#B45309';
    return colors.success;
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>{t('Profiling & Scoring')}</Text>
        <View style={{ backgroundColor: getCategoryBg(scoreData.band), paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: getCategoryColor(scoreData.band) }}>
          <Text style={{ fontWeight: '900', color: getCategoryColor(scoreData.band) }}>{t('SCORE:')} {scoreData.raw} ({scoreData.band})</Text>
        </View>
      </View>
      
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg }}>
        {t("Score 1–10 for each; Minimum 75/100 required to proceed.")}
      </Text>

      {SCORING_ASPECTS.map((aspect) => {
        const tableData = getDynamicTableData(aspect.key, watch(aspect.key as any) || 5);
        return (
          <View key={aspect.key} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
            <Controller control={control} name={aspect.key as any} render={({field}) => <ScoreSlider label={t(aspect.label)} value={field.value} onChange={field.onChange} />} />
            
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('Evaluate Based On:')}</Text>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500', marginBottom: 12, lineHeight: 18 }}>{t(aspect.params)}</Text>
              
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{t(tableData.headers[0])}</Text></View>
                  <View style={{ flex: 1, padding: 8, justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{t(tableData.headers[1])}</Text></View>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF' }}>
                  <View style={{ flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' }}><Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.primary, fontWeight: '600', lineHeight: 18 }}>{t(tableData.row[0])}</Text></View>
                  <View style={{ flex: 1, padding: 8, justifyContent: 'center' }}><Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.primary, fontWeight: '600', lineHeight: 18 }}>{t(tableData.row[1])}</Text></View>
                </View>
              </View>
            </View>

            <Controller control={control} name={aspect.rem as any} render={({field}) => <TextArea label={t("Remarks")} value={field.value} onChangeText={field.onChange} minHeight={60} placeholder={t("Type notes here...")} />} />
            <Controller control={control} name={aspect.aud as any} render={({field}) => (
              <AudioRecorder value={field.value} loading={uploading[aspect.aud]} onRecord={(uri) => handleAudioUpload(aspect.aud, uri)} onClear={() => { field.onChange(''); setValue(aspect.aud as any, ''); }} />
            )} />
          </View>
        );
      })}
      
      <View style={{ backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#FCA5A5' }}>
        <Controller control={control} name="redFlags" render={({field}) => <TextArea label={t("Red Flags Noted (If Any)")} value={field.value} onChangeText={field.onChange} placeholder={t("Enter any critical warnings or shortcomings...")} />} />
        <Controller control={control} name="audioRedFlags" render={({field}) => (
          <AudioRecorder value={field.value} loading={uploading['audioRedFlags']} onRecord={(uri) => handleAudioUpload('audioRedFlags', uri)} onClear={() => { field.onChange(''); setValue('audioRedFlags', ''); }} />
        )} />
      </View>
    </View>
  );
};