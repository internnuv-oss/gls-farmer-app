import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { ScoreSlider, TextArea, AudioRecorder } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';

// EXACT MAPPING FROM THE DISTRIBUTOR PDF DOCUMENT
const DISTRIBUTOR_SCORING_ASPECTS = [
  { key: 'scoreFinancial', rem: 'remFinancial', aud: 'audioFinancial', label: 'Financial Health (15% Weight)', params: 'Annual turnover (last 2-3 years), credit history, payment discipline with suppliers' },
  { key: 'scoreReputation', rem: 'remReputation', aud: 'audioReputation', label: 'Market Reputation (15% Weight)', params: 'Dealer & farmer feedback, any complaints/litigation, reliability in payments/deliveries' },
  { key: 'scoreOperations', rem: 'remOperations', aud: 'audioOperations', label: 'Operations & Infrastructure (10% Weight)', params: 'Storage facilities (capacity, cold chain if needed, hygiene), logistics reach, office setup' },
  { key: 'scoreDealerNetwork', rem: 'remDealerNetwork', aud: 'audioDealerNetwork', label: 'Dealer Network (15% Weight)', params: 'No. of active dealers (target ≥150), geographic coverage, loyalty of dealers' },
  { key: 'scoreTeam', rem: 'remTeam', aud: 'audioTeam', label: 'Team & Professionalism (10% Weight)', params: 'Sales team size & quality, training culture, use of digital tools, owner involvement' },
  { key: 'scorePortfolio', rem: 'remPortfolio', aud: 'audioPortfolio', label: 'Current Portfolio (10% Weight)', params: 'Companies represented, products (chemical vs bio), % of bio sales, any competing bio lines' },
  { key: 'scoreExperience', rem: 'remExperience', aud: 'audioExperience', label: 'Experience in Biologicals (15% Weight)', params: 'Past bio suppliers tried, results seen, current bio % of turnover, openness to bio' },
  { key: 'scoreGrowth', rem: 'remGrowth', aud: 'audioGrowth', label: 'Growth Orientation (10% Weight)', params: 'Willingness for exclusive/authorised status, interest in farmer support programs' },
];

// Dynamic Table Data mapped strictly to the Business Rules in the Document
const getDynamicTableData = (key: string, score: number) => {
  if (key === 'scoreFinancial') {
    const headers = ["Annual Turnover (INR)", "Payment & Credit History"];
    if (score <= 2) return { headers, row: ["< 1 Cr", 'Frequent defaults; relies on local high-interest "Market Credit."'] };
    if (score <= 4) return { headers, row: ["1 Cr - 3 Cr", '"Hand-to-mouth" cash flow; payment delays of 60+ days.'] };
    if (score <= 6) return { headers, row: ["3 Cr - 7 Cr", "Stable; generally pays within 30-45 days; healthy bank limits."] };
    if (score <= 8) return { headers, row: ["7 Cr - 15 Cr", "Highly disciplined; pays on PDC/Due date; strong cash reserves."] };
    return { headers, row: ["> 15 Cr", "Advance payment history; high liquidity; top-tier MNC credit profile."] };
  }
  if (key === 'scoreReputation') {
    const headers = ["Dealer & Trade Feedback", "Reliability & Ethics"];
    if (score <= 2) return { headers, row: ["Negative / Risk", 'Known for "Stock Dumping" or price-cutting; unreliable delivery.'] };
    if (score <= 4) return { headers, row: ["Neutral", 'Perceived as a "B-grade" distributor; rigid in credit terms.'] };
    if (score <= 6) return { headers, row: ["Respected", "Transparent in dealings; reliable delivery schedules; fair pricing."] };
    if (score <= 8) return { headers, row: ["Influential", "Dealers look to them for market trends; strong Mandi links."] };
    return { headers, row: ["District Leader", "Impeccable integrity; most dealers' first choice for high-end brands."] };
  }
  if (key === 'scoreOperations') {
    const headers = ["Storage Capacity", "Logistics & Tech"];
    if (score <= 2) return { headers, row: ["< 1,000 sq. ft.", "No delivery vehicle; manual billing; stock kept in open areas."] };
    if (score <= 4) return { headers, row: ["2,000 sq. ft.", "Rents vehicles for delivery; basic digital accounting (Tally)."] };
    if (score <= 6) return { headers, row: ["5,000 sq. ft.", "Owns 1 delivery van; hygienic warehouse; full digital billing."] };
    if (score <= 8) return { headers, row: ["10,000 sq. ft.", "2+ dedicated vans; organized FIFO system; real-time inventory."] };
    return { headers, row: ["20,000+ sq. ft.", 'Fleet of vehicles; separate "Bio-Cool" storage; ERP integrated.'] };
  }
  if (key === 'scoreDealerNetwork') {
    const headers = ["No. of Active Dealers", "Geographic Coverage"];
    if (score <= 2) return { headers, row: ["< 30 Dealers", "Limited to one small Tehsil/Sub-district."] };
    if (score <= 4) return { headers, row: ["30 - 50 Dealers", "Scattered reach; low dealer loyalty/stickiness."] };
    if (score <= 6) return { headers, row: ["50 - 80 Dealers", "Covers 2-3 Tehsils; consistent monthly billing from 60% of network."] };
    if (score <= 8) return { headers, row: ["80 - 120 Dealers", "Covers the entire District; high dealer loyalty."] };
    return { headers, row: ["> 120 Dealers", "Dominates the region; reaches deep interior village outlets."] };
  }
  if (key === 'scoreTeam') {
    const headers = ["Sales Team Size", "Quality & Training"];
    if (score <= 2) return { headers, row: ["Owner only", "No dedicated staff; owner is often unavailable for strategy."] };
    if (score <= 4) return { headers, row: ["1-2 Staff members", "Helpers only; no technical knowledge; no digital tool usage."] };
    if (score <= 6) return { headers, row: ["3+ Sales staff", "Staff has basic product knowledge; uses mobile order-booking apps."] };
    if (score <= 8) return { headers, row: ["5+ Sales staff", "Dedicated field person; owner is actively involved in growth meetings."] };
    return { headers, row: ["Professional Hierarchy", "Dedicated Technical & Demo team; structured weekly reporting."] };
  }
  if (key === 'scorePortfolio') {
    const headers = ["Range of Companies", "Product Mix (Chemical vs. Bio)"];
    if (score <= 2) return { headers, row: ["Unbranded/Generics", 'Focuses on Urea/DAP and low-margin "local" chemicals.'] };
    if (score <= 4) return { headers, row: ["Mixed Portfolio", "80% Generic/Old chemistry; low-tier seed companies."] };
    if (score <= 6) return { headers, row: ["Branded Mid-tier", "Represents 2-3 mid-sized brands; balanced portfolio."] };
    if (score <= 8) return { headers, row: ["MNC Heavy", "Represents Top-tier MNCs; specialty chemicals focus."] };
    return { headers, row: ["Specialty/IPM", 'High focus on specialty nutrition; values "Premium" over "Volume."'] };
  }
  if (key === 'scoreExperience') {
    const headers = ["Past Experience", "Current Bio % of Turnover"];
    if (score <= 2) return { headers, row: ["Zero / Negative", "Avoids Bio; believes it's 'ineffective' or high-risk."] };
    if (score <= 4) return { headers, row: ["Passive", "Sells Bio only if forced by market; < 3% of sales."] };
    if (score <= 6) return { headers, row: ["Open-Minded", "Has tried 1-2 Bio lines with average results; 3-7% of sales."] };
    if (score <= 8) return { headers, row: ["Bio-Focused", "Actively sells Bio-stimulants; 8-15% of sales."] };
    return { headers, row: ["Bio-Specialist", "Known in the market for Soil Health & Bio; >15% of total sales."] };
  }
  if (key === 'scoreGrowth') {
    const headers = ["Partnership Interest", "Revenue Capacity for GLS"];
    if (score <= 2) return { headers, row: ["Transactional only", 'No interest in brand building; "Just give me the margin."'] };
    if (score <= 4) return { headers, row: ["Low", "Willing to stock but won't provide dealer data or support."] };
    if (score <= 6) return { headers, row: ["Collaborative", 'Interested in "Authorized" tag; willing to share data.'] };
    if (score <= 8) return { headers, row: ["High Ambition", "Wants brand support; ready to commit to seasonal targets."] };
    return { headers, row: ["Strategic Partner", "Ready for Exclusivity; willing to co-fund farmer support programs."] };
  }
  return { headers: ["Evaluation Parameter", "Score Implication"], row: ["Standard Assessment", "Score determines overall profile capability."] };
};

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  scoreData: { raw: number, band: string };
  uploading?: Record<string, boolean>;
  handleAudioUpload?: (key: string, uri: string) => void;
  t: any;
}

export const Step2Scoring = ({ form, scoreData, uploading = {}, handleAudioUpload, t }: Props) => {
  const { control, watch, setValue } = form;

  // Adaptive Styling for Grade Classifications
  const getCategoryBg = (band: string) => {
    if (band.includes('A+')) return '#E0E7FF'; // Indigo
    if (band.includes('A')) return '#DCFCE7';  // Green
    if (band.includes('B')) return '#FEF3C7';  // Amber
    return '#FEE2E2'; // Red
  };
  const getCategoryColor = (band: string) => {
    if (band.includes('A+')) return '#3730A3';
    if (band.includes('A')) return '#166534';
    if (band.includes('B')) return '#B45309';
    return '#991B1B'; 
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 20, fontWeight: '800', flex: 1 }}>{t("Profiling & Scoring")}</Text>
        <View style={{ backgroundColor: getCategoryBg(scoreData.band), paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
          <Text style={{ fontWeight: '900', color: getCategoryColor(scoreData.band) }}>
            {scoreData.raw}/100 ({scoreData.band.split(' ')[0]})
          </Text>
        </View>
      </View>
      
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 }}>
        {t("Score the distributor from 1-10 on each parameter. The final score is weighted according to GLS logic.")}
      </Text>

      {DISTRIBUTOR_SCORING_ASPECTS.map((aspect) => {
        const tableData = getDynamicTableData(aspect.key, watch(aspect.key as any) || 5);
        
        return (
          <View key={aspect.key} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
            
            <Controller 
              control={control} 
              name={aspect.key as any} 
              render={({field}) => <ScoreSlider label={t(aspect.label)} value={field.value} onChange={field.onChange} />} 
            />
            
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t("Evaluate Based On:")}
              </Text>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500', marginBottom: 12, lineHeight: 18 }}>
                {t(aspect.params)}
              </Text>
              
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

            <Controller 
              control={control} 
              name={aspect.rem as any} 
              render={({field}) => <TextArea label={t("Remarks (Optional Text)")} value={field.value} onChangeText={field.onChange} minHeight={60} placeholder={t("Type evaluation notes here...")} />} 
            />
            
            {/* Audio Recorder for each specific aspect */}
            {handleAudioUpload && (
              <Controller control={control} name={aspect.aud as any} render={({field}) => (
                <AudioRecorder value={field.value} loading={uploading[aspect.aud]} onRecord={(uri) => handleAudioUpload(aspect.aud, uri)} onClear={() => { field.onChange(''); setValue(aspect.aud as any, ''); }} />
              )} />
            )}
          </View>
        );
      })}
      
      <View style={{ backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#FCA5A5', marginTop: spacing.sm }}>
        <Controller 
          control={control} 
          name="redFlags" 
          render={({field}) => <TextArea label={t("Red Flags Noted (If Any)")} value={field.value} onChangeText={field.onChange} placeholder={t("Poor payment record, negative reputation, bad storage, etc...")} />} 
        />
        
        {handleAudioUpload && (
          <Controller control={control} name="audioRedFlags" render={({field}) => (
            <AudioRecorder value={field.value} loading={uploading['audioRedFlags']} onRecord={(uri) => handleAudioUpload('audioRedFlags', uri)} onClear={() => { field.onChange(''); setValue('audioRedFlags', ''); }} />
          )} />
        )}
      </View>
    </View>
  );
};