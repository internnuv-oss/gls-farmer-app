import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { ScoreSlider, TextArea, AudioRecorder } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DealerOnboardingValues } from '../../schema';

const SCORING_ASPECTS = [
  { key: 'scoreFinancial', rem: 'remFinancial', aud: 'audioFinancial', label: 'Financial Health & Turnover', params: 'Annual turnover, payment discipline with suppliers' },
  { key: 'scoreReputation', rem: 'remReputation', aud: 'audioReputation', label: 'Market Reputation', params: 'Feedback from local farmers & neighbouring dealers' },
  { key: 'scoreOperations', rem: 'remOperations', aud: 'audioOperations', label: 'Shop Operations & Infrastructure', params: 'Shop visibility, storage space & condition, display area, hygiene' },
  { key: 'scoreFarmerNetwork', rem: 'remFarmerNetwork', aud: 'audioFarmerNetwork', label: 'Farmer Network & Reach', params: 'No. of regular farmer customers (target 50–200+), villages covered, loyalty' },
  { key: 'scoreTeam', rem: 'remTeam', aud: 'audioTeam', label: 'Team & Professionalism', params: 'Owner involvement, staff quality, willingness to undergo training' },
  { key: 'scorePortfolio', rem: 'remPortfolio', aud: 'audioPortfolio', label: 'Current Portfolio', params: 'Products currently sold (chemicals, seeds, bio), % bio sales if any' },
  { key: 'scoreExperience', rem: 'remExperience', aud: 'audioExperience', label: 'Experience & Openness to Bio', params: 'Past experience with biologicals, openness to GLS packages & Field Executive' },
  { key: 'scoreGrowth', rem: 'remGrowth', aud: 'audioGrowth', label: 'Growth Orientation', params: 'Interest in Authorised/Exclusive status, capacity for ₹2.5–7.5 Lacs revenue' },
];

const getDynamicTableData = (key: string, score: number) => {
  if (key === 'scoreFinancial') {
    const headers = ["Annual Turnover (INR)", "Payment Discipline / Evidence"];
    if (score <= 2) return { headers, row: ["₹5L - ₹10L", "Frequent defaults; relies on local high-interest lenders; high debt."] };
    if (score <= 4) return { headers, row: ["₹10L - ₹25L", "\"Hand-to-mouth\" cash flow; pays only after 60+ days or multiple reminders."] };
    if (score <= 6) return { headers, row: ["₹25L - ₹60L", "Stable; pays within standard 30-day credit cycles; uses bank CC limits."] };
    if (score <= 8) return { headers, row: ["₹60L - ₹1 Cr", "Strong liquidity; pays before due dates; high credit limit with MNCs."] };
    return { headers, row: ["> ₹1 Cr", "Cash-rich; often pays advance for extra margins; zero payment friction."] };
  }
  if (key === 'scoreReputation') {
    const headers = ["Farmer & Peer Feedback", "Remarks / Evidence"];
    if (score <= 2) return { headers, row: ["Negative feedback", "Known for selling \"expired\" or \"substandard\" stock; price-cutter."] };
    if (score <= 4) return { headers, row: ["Neutral/Basic", "Perceived as a \"small player\"; farmers go there only for convenience."] };
    if (score <= 6) return { headers, row: ["Reliable", "Known for fair pricing and providing standard, genuine products."] };
    if (score <= 8) return { headers, row: ["Respected Advisor", "Farmers seek his advice on pest management; high ethical standing."] };
    return { headers, row: ["Market Leader", "Influences village-level decisions; acts as a \"community leader.\""] };
  }
  if (key === 'scoreOperations') {
    const headers = ["Infrastructure", "Hygiene & Condition"];
    if (score <= 2) return { headers, row: ["<200 sq. ft. shop", "No godown; stock kept in the shop or outside; messy/dirty."] };
    if (score <= 4) return { headers, row: ["Standard shop", "No separate godown; stock piled in corners; branding is hidden."] };
    if (score <= 6) return { headers, row: ["Clean shop + Room", "Small storage room attached; pallets used; visible counters."] };
    if (score <= 8) return { headers, row: ["Large shop + Godown", "1 dedicated off-site godown; prime location; clear GLS branding."] };
    return { headers, row: ["\"Model\" Outlet", "2+ large godowns; separate office; digital billing; showroom-feel."] };
  }
  if (key === 'scoreFarmerNetwork') {
    const headers = ["Active Farmer Base", "Village Coverage"];
    if (score <= 2) return { headers, row: ["< 40 farmers", "Limited to the immediate neighborhood only."] };
    if (score <= 4) return { headers, row: ["40 - 80 farmers", "Covers 2-3 nearby villages."] };
    if (score <= 6) return { headers, row: ["80 - 150 farmers", "Covers 4-7 villages; good repeat walk-in customers."] };
    if (score <= 8) return { headers, row: ["150 - 250 farmers", "Covers 8-12 villages; farmers travel long distances to visit."] };
    return { headers, row: ["> 250 farmers", "Covers 15+ villages (Entire Block); massive loyalty."] };
  }
  if (key === 'scoreTeam') {
    const headers = ["Owner/Staff Status", "Willingness for Training"];
    if (score <= 2) return { headers, row: ["Owner absent", "No staff; shop managed by untrained family/helpers."] };
    if (score <= 4) return { headers, row: ["Owner semi-active", "1 helper (unskilled); resistant to new technical methods."] };
    if (score <= 6) return { headers, row: ["Owner active", "1-2 trained staff; participates in training occasionally."] };
    if (score <= 8) return { headers, row: ["Professional Setup", "3+ staff; dedicated field person; eager for technical growth."] };
    return { headers, row: ["Highly Proactive", "Organized team; dedicated demo executive; hosts training for farmers."] };
  }
  if (key === 'scorePortfolio') {
    const headers = ["Product Range Focus", "% of Branded vs. Generic"];
    if (score <= 2) return { headers, row: ["Commodities", "Only Urea/DAP; focuses on low-margin generic bulk."] };
    if (score <= 4) return { headers, row: ["Generic Mix", "Mostly seeds & 80% generic/unbranded pesticides."] };
    if (score <= 6) return { headers, row: ["Balanced", "Mix of branded and generic; stocks standard seeds."] };
    if (score <= 8) return { headers, row: ["High-Value", "Focuses on specialty chemicals; values quality over price."] };
    return { headers, row: ["Premium", "Specialized in Horticulture/IPM; pushes high-end solutions."] };
  }
  if (key === 'scoreExperience') {
    const headers = ["Past Experience", "Current Bio % of Sales"];
    if (score <= 2) return { headers, row: ["Negative", "\"Bio doesn't work\" mindset; 0% Bio sales."] };
    if (score <= 4) return { headers, row: ["Skeptical", "Has tried poor quality bio before; <3% Bio sales."] };
    if (score <= 6) return { headers, row: ["Open", "Sells bio on recommendation; 3-8% Bio sales."] };
    if (score <= 8) return { headers, row: ["Bio-Proactive", "Willing to stock GLS packages; 8-15% Bio sales."] };
    return { headers, row: ["\"Bio-Expert\"", "Actively pushes biologicals as first-line defense; >15% Bio sales."] };
  }
  if (key === 'scoreGrowth') {
    const headers = ["Revenue Potential (GLS)", "Interest in Partnership"];
    if (score <= 2) return { headers, row: ["< ₹1 Lac", "No interest; \"just another supplier\" attitude."] };
    if (score <= 4) return { headers, row: ["₹1 - ₹2 Lacs", "Content with current scale; no commitment to targets."] };
    if (score <= 6) return { headers, row: ["₹2.5 - ₹4 Lacs", "Wants \"Authorized\" status; will share farmer data."] };
    if (score <= 8) return { headers, row: ["₹4 - ₹6 Lacs", "High interest in exclusivity; requests branding/marketing help."] };
    return { headers, row: ["₹7.5 Lacs +", "Wants to be the lead regional partner; drives massive volume."] };
  }
  return { headers: ["Evaluation Parameter", "Score Implication"], row: ["Standard Assessment", "Score determines overall profile capability."] };
};

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  scoreData: { raw: number, band: string };
  uploading: Record<string, boolean>;
  handleAudioUpload: (key: string, uri: string) => void;
  getCategoryBg: (band: string) => string;
  getCategoryColor: (band: string) => string;
}

export const Step2Profiling = ({ form, scoreData, uploading, handleAudioUpload, getCategoryBg, getCategoryColor }: Props) => {
  const { control, watch, setValue } = form;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>Profiling & Scoring</Text>
        <View style={{ backgroundColor: getCategoryBg(scoreData.band), paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
          <Text style={{ fontWeight: '900', color: getCategoryColor(scoreData.band) }}>SCORE: {scoreData.raw} ({scoreData.band})</Text>
        </View>
      </View>

      {SCORING_ASPECTS.map((aspect) => {
        const tableData = getDynamicTableData(aspect.key, watch(aspect.key as any) || 5);
        return (
          <View key={aspect.key} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
            <Controller control={control} name={aspect.key as any} render={({field}) => <ScoreSlider label={aspect.label} value={field.value} onChange={field.onChange} />} />
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Evaluate Based On:</Text>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500', marginBottom: 12, lineHeight: 18 }}>{aspect.params}</Text>
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{tableData.headers[0]}</Text></View>
                  <View style={{ flex: 1, padding: 8, justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{tableData.headers[1]}</Text></View>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF' }}>
                  <View style={{ flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' }}><Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.primary, fontWeight: '600', lineHeight: 18 }}>{tableData.row[0]}</Text></View>
                  <View style={{ flex: 1, padding: 8, justifyContent: 'center' }}><Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.primary, fontWeight: '600', lineHeight: 18 }}>{tableData.row[1]}</Text></View>
                </View>
              </View>
            </View>
            <Controller control={control} name={aspect.rem as any} render={({field}) => <TextArea label="Remarks (Optional Text)" value={field.value} onChangeText={field.onChange} minHeight={60} placeholder="Type notes here..." />} />
            <Controller control={control} name={aspect.aud as any} render={({field}) => (
              <AudioRecorder value={field.value} loading={uploading[aspect.aud]} onRecord={(uri) => handleAudioUpload(aspect.aud, uri)} onClear={() => { field.onChange(''); setValue(aspect.aud as any, ''); }} />
            )} />
          </View>
        );
      })}
      
      <View style={{ backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#FCA5A5' }}>
        <Controller control={control} name="redFlags" render={({field}) => <TextArea label="Red Flags Noted (If Any)" value={field.value} onChangeText={field.onChange} placeholder="Enter any critical warnings..." />} />
        <Controller control={control} name="audioRedFlags" render={({field}) => (
          <AudioRecorder value={field.value} loading={uploading['audioRedFlags']} onRecord={(uri) => handleAudioUpload('audioRedFlags', uri)} onClear={() => { field.onChange(''); setValue('audioRedFlags', ''); }} />
        )} />
      </View>
    </View>
  );
};