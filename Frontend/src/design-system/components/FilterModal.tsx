import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, radius, shadows, spacing, typography } from '../tokens';

export type FilterState = {
  sortBy: string;
  completionStatus: string[];
  routeId: string[]; 
  category: string[];
  firmType: string[];
  linkedStatus: string[];
  proposedStatus: string[];
  willingDemoFarmers: string[];
  region: string[];
  scale: string[];
  farmerCrops: string[]; 
  farmerSoil: string[];  
  farmerWater: string[];
  distributorBand: string[];
  distributorStatus: string[];
  distributorColdChain: string[]; 
  // 🚀 NEW: Advanced Farmer Filters
  fsppStatus: string[];
  farmCardStatus: string[];
  // 🚀 NEW: Advanced FPO Filters
  fpoScale: string[];
  fpoBusiness: string[];
  fpoPromotingAgency: string[];
};

export const defaultFilters: FilterState = {
  sortBy: "latest",
  completionStatus: [],
  routeId: [], 
  category: [],
  firmType: [],
  linkedStatus: [],
  proposedStatus: [],
  willingDemoFarmers: [],
  region: [],
  scale: [],
  farmerCrops: [], 
  farmerSoil: [],  
  farmerWater: [],
  distributorBand: [],
  distributorStatus: [],
  distributorColdChain: [], 
  // 🚀 NEW: Default empty arrays
  fsppStatus: [],
  farmCardStatus: [],
  fpoScale: [],
  fpoBusiness: [],
  fpoPromotingAgency: [],
};

type FilterModalProps = {
  visible: boolean;
  entityType: string;
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onClose: () => void;
  routesList?: { label: string, value: string }[]; 
};

const CheckboxRow = ({ label, isSelected, onToggle }: { label: string, isSelected: boolean, onToggle: () => void }) => (
  <Pressable onPress={onToggle} style={styles.checkboxRow}>
    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
      {isSelected && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
    </View>
    <Text style={[styles.checkboxLabel, isSelected && { color: colors.text, fontWeight: '700' }]}>{label}</Text>
  </Pressable>
);

const FilterAccordionGroup = ({ title, options, selectedValues, onToggleItem }: { title: string, options: {label: string, value: string}[], selectedValues: string[], onToggleItem: (val: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const count = selectedValues.length;

  return (
    <View style={styles.accordionContainer}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.accordionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.accordionTitle}>{title}</Text>
          {count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          )}
        </View>
        <MaterialIcons name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color={colors.textMuted} />
      </Pressable>
      
      {expanded && (
        <View style={styles.accordionBody}>
          {options.map(opt => (
            <CheckboxRow 
              key={opt.value} 
              label={opt.label} 
              isSelected={selectedValues.includes(opt.value)} 
              onToggle={() => onToggleItem(opt.value)} 
            />
          ))}
        </View>
      )}
    </View>
  );
};

export const FilterModal: React.FC<FilterModalProps> = ({ visible, entityType, currentFilters, onApply, onClose, routesList }) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

  useEffect(() => {
    if (visible) setLocalFilters(currentFilters);
  }, [visible, currentFilters]);

  const handleSortUpdate = (value: string) => {
    setLocalFilters(prev => ({ ...prev, sortBy: value }));
  };

  const toggleFilter = (key: keyof FilterState, value: string) => {
    setLocalFilters(prev => {
      const currentArray = prev[key] as string[];
      if (currentArray.includes(value)) {
        return { ...prev, [key]: currentArray.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...currentArray, value] };
      }
    });
  };

  const handleReset = () => setLocalFilters(defaultFilters);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          
          <View style={styles.sheet}>
            <View style={styles.dragPill} />

            <View style={styles.header}>
              <Text style={styles.title}>Filter & Sort</Text>
              <View style={styles.headerActions}>
                <Pressable onPress={handleReset}>
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
              
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Sort {entityType}</Text>
                {[
                  { label: "Newest First", value: "latest" },
                  ...(entityType === "Dealers" || entityType === "Distributors" ? [
                    { label: "Highest Score", value: "score_high" },
                    { label: "Lowest Score", value: "score_low" }
                  ] : []),
                  ...(entityType === "Farmers" ? [
                    { label: "Largest Land Holding", value: "land_high" },
                    { label: "Smallest Land Holding", value: "land_low" }
                  ] : [])
                ].map(opt => (
                  <Pressable key={opt.value} onPress={() => handleSortUpdate(opt.value)} style={styles.radioRow}>
                    <View style={[styles.radio, localFilters.sortBy === opt.value && styles.radioActive]}>
                      {localFilters.sortBy === opt.value && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.radioLabel, localFilters.sortBy === opt.value && { color: colors.text, fontWeight: '700' }]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Filter Parameters</Text>

              <FilterAccordionGroup 
                title="Completion Status" 
                selectedValues={localFilters.completionStatus} 
                onToggleItem={(val) => toggleFilter('completionStatus', val)}
                options={[
                  { label: "Submitted Profiles", value: "Completed" },
                  { label: "Draft Profiles", value: "Incomplete" }
                ]} 
              />

              {entityType === "Dealers" && (
                <>
                  <FilterAccordionGroup 
                    title="Risk Category" 
                    selectedValues={localFilters.category} 
                    onToggleItem={(val) => toggleFilter('category', val)}
                    options={[
                      { label: "Elite (>60 Points)", value: "Elite" },
                      { label: "A-Category (46-60 Points)", value: "A-Category" },
                      { label: "B-Category (26-45 Points)", value: "B-Category" },
                      { label: "C-Category (<26 Points)", value: "C-Category" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Proposed Status" 
                    selectedValues={localFilters.proposedStatus} 
                    onToggleItem={(val) => toggleFilter('proposedStatus', val)}
                    options={[
                      { label: "Authorised Dealer", value: "Authorised Dealer" },
                      { label: "Exclusive Dealer", value: "Exclusive Dealer" },
                      { label: "Dealer", value: "Dealer" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Firm Type" 
                    selectedValues={localFilters.firmType} 
                    onToggleItem={(val) => toggleFilter('firmType', val)}
                    options={[
                      { label: "Proprietorship", value: "Proprietorship" },
                      { label: "Partnership", value: "Partnership" },
                      { label: "Pvt Ltd", value: "Pvt Ltd" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Distributor Linkage" 
                    selectedValues={localFilters.linkedStatus} 
                    onToggleItem={(val) => toggleFilter('linkedStatus', val)}
                    options={[
                      { label: "Linked to Distributor", value: "Linked" },
                      { label: "Unlinked (Direct)", value: "Unlinked" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Demo Farmer Willingness" 
                    selectedValues={localFilters.willingDemoFarmers} 
                    onToggleItem={(val) => toggleFilter('willingDemoFarmers', val)}
                    options={[
                      { label: "Yes, willing to work with farmers", value: "Yes" },
                      { label: "No, not interested", value: "No" }
                    ]} 
                  />
                </>
              )}

              {entityType === "Distributors" && (
                <>
                  <FilterAccordionGroup 
                    title="Score Grade" 
                    selectedValues={localFilters.distributorBand} 
                    onToggleItem={(val) => toggleFilter('distributorBand', val)}
                    options={[
                      { label: "Grade A+ (Platinum)", value: "Grade A+" },
                      { label: "Grade A (Strategic)", value: "Grade A" },
                      { label: "Grade B (Operational)", value: "Grade B" },
                      { label: "Grade C (High Risk)", value: "Grade C" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Proposed Status" 
                    selectedValues={localFilters.distributorStatus} 
                    onToggleItem={(val) => toggleFilter('distributorStatus', val)}
                    options={[
                      { label: "Authorised Distributor", value: "Authorised Distributor" },
                      { label: "Exclusive Focus Area", value: "Exclusive Focus Area" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Cold Chain Facility" 
                    selectedValues={localFilters.distributorColdChain} 
                    onToggleItem={(val) => toggleFilter('distributorColdChain', val)}
                    options={[
                      { label: "Yes", value: "Yes" },
                      { label: "No", value: "No" }
                    ]} 
                  />
                </>
              )}

              {entityType === "Farmers" && (
                <>
                  {routesList && routesList.length > 0 && (
                    <FilterAccordionGroup 
                      title="Assigned Routes" 
                      selectedValues={localFilters.routeId} 
                      onToggleItem={(val) => toggleFilter('routeId', val)}
                      options={routesList} 
                    />
                  )}
                  <FilterAccordionGroup 
                    title="Farm Scale" 
                    selectedValues={localFilters.scale} 
                    onToggleItem={(val) => toggleFilter('scale', val)}
                    options={[
                      { label: "Marginal (< 2 Acres)", value: "Marginal" },
                      { label: "Small (2-5 Acres)", value: "Small" },
                      { label: "Large (> 5 Acres)", value: "Large" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Major Crops" 
                    selectedValues={localFilters.farmerCrops} 
                    onToggleItem={(val) => toggleFilter('farmerCrops', val)}
                    options={[
                      { label: "Cotton", value: "Cotton" },
                      { label: "Groundnut", value: "Groundnut" },
                      { label: "Sugarcane", value: "Sugarcane" },
                      { label: "Wheat", value: "Wheat" },
                      { label: "Bajra", value: "Bajra" },
                      { label: "Maize", value: "Maize" },
                      { label: "Castor", value: "Castor" },
                      { label: "Soybean", value: "Soybean" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Soil Type" 
                    selectedValues={localFilters.farmerSoil} 
                    onToggleItem={(val) => toggleFilter('farmerSoil', val)}
                    options={[
                      { label: "Black", value: "Black" },
                      { label: "Sandy", value: "Sandy" },
                      { label: "Red", value: "Red" },
                      { label: "Loamy", value: "Loamy" },
                      { label: "Others", value: "Others" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Water Source" 
                    selectedValues={localFilters.farmerWater} 
                    onToggleItem={(val) => toggleFilter('farmerWater', val)}
                    options={[
                      { label: "Canal", value: "Canal" },
                      { label: "Borewell", value: "Borewell" },
                      { label: "Rain", value: "Rain" },
                      { label: "Others", value: "Others" }
                    ]} 
                  />
                  {/* 🚀 NEW: Advanced Farmer Filters */}
                  <FilterAccordionGroup 
                    title="FSPP Assessment Status" 
                    selectedValues={localFilters.fsppStatus} 
                    onToggleItem={(val) => toggleFilter('fsppStatus', val)}
                    options={[
                      { label: "Completed", value: "Completed" },
                      { label: "Pending", value: "Pending" }
                    ]} 
                  />
                </>
              )}

              {/* 🚀 NEW: FPO Specific Filters */}
              {entityType === "FPOs" && (
                <>
                  <FilterAccordionGroup 
                    title="FPO Member Scale" 
                    selectedValues={localFilters.fpoScale} 
                    onToggleItem={(val) => toggleFilter('fpoScale', val)}
                    options={[
                      { label: "Small (<250)", value: "Small (<250)" },
                      { label: "Medium (250-1000)", value: "Medium (250-1000)" },
                      { label: "Large (>1000)", value: "Large (>1000)" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Business Activities" 
                    selectedValues={localFilters.fpoBusiness} 
                    onToggleItem={(val) => toggleFilter('fpoBusiness', val)}
                    options={[
                      { label: "Input Retailing", value: "Input Retailing" },
                      { label: "Output Procurement", value: "Output Procurement" },
                      { label: "Custom Hiring Center", value: "Custom Hiring Center" },
                      { label: "Value Addition / Processing", value: "Value Addition / Processing" }
                    ]} 
                  />
                  <FilterAccordionGroup 
                    title="Promoting Agency" 
                    selectedValues={localFilters.fpoPromotingAgency} 
                    onToggleItem={(val) => toggleFilter('fpoPromotingAgency', val)}
                    options={[
                      { label: "NABARD", value: "NABARD" },
                      { label: "SFAC", value: "SFAC" },
                      { label: "NCDC", value: "NCDC" },
                      { label: "State Govt", value: "State Govt" },
                      { label: "NGO / CSR", value: "NGO / CSR" },
                      { label: "Independent", value: "Independent" }
                    ]} 
                  />
                </>
              )}

            </ScrollView>

            <View style={styles.footer}>
              <Button label={`Apply Settings`} onPress={() => { onApply(localFilters); onClose(); }} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl, maxHeight: '90%', ...shadows.medium },
  dragPill: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.headingMd, color: colors.text, fontWeight: '900' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  resetText: { color: colors.danger, fontWeight: '800', fontSize: 14 },
  closeBtn: { backgroundColor: '#F1F5F9', padding: 6, borderRadius: 20 },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  sectionBlock: { marginTop: spacing.sm },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  radioLabel: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },

  accordionContainer: { borderBottomWidth: 1, borderBottomColor: colors.border },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  accordionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  badge: { backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  accordionBody: { paddingBottom: 16 },
  
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600', flex: 1 },

  footer: { marginTop: spacing.md, paddingTop: spacing.md }
});