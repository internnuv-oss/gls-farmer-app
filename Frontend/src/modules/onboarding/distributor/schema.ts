import { z } from 'zod';

export const DISTRIBUTOR_GLS_COMMITMENTS = [
  "Clean 10% margin on Dealer Rate", 
  "All dealer schemes & loyalty rewards 100% funded by GLS", 
  "Two-tier model: GLS invoices distributor; GLS field team drives 60% retail", 
  "Dedicated Field Executives for 150+ farmers", 
  "Crop-specific packages, Farm Card + Calendar, Loyalty Program support"
];

export const DISTRIBUTOR_COMPLIANCE_ITEMS = [
  "Valid FCO Authorization / Fertilizer Dealer Registration",
  "Valid Insecticide Selling License (for biopesticides)",
  "Educational Qualification Certificate (if applicable)",
  "Storage Facility Photos & Suitability Confirmation",
  "GST Certificate",
  "Any state-specific approvals"
];

export const distributorOnboardingSchema = z.object({
  // ---> STEP 1: Basic Info <---
  firmName: z.string().min(2, "Firm Name is required"),
  ownerName: z.string().min(2, "Owner Name is required"),
  
  // Splitting Contact Person and Designation
  contactPerson: z.string().min(2, "Contact Person is required"),
  contactDesignation: z.string().min(2, "Designation is required"),
  
  contactMobile: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  
  // Splitting Address
  address: z.string().min(5, "Registered Office Address is required"),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "District is required"),
  taluka: z.string().min(2, "Taluka is required"),
  pincode: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
  
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST Format"),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN Format"),
  estYear: z.string().min(4, "Year is required"),
  firmType: z.string().min(1, "Firm Type is required"),
  
  bankAccounts: z.array(z.object({
    accountName: z.string().min(2, "Account Name required"),
    accountNumber: z.string().regex(/^\d{9,18}$/, "Must be 9-18 digits"), 
    bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Format"),
    bankNameBranch: z.string().min(2, "Bank Name & Branch required"),
  })).min(1, "At least one bank account is required"),
  
 

  // ---> STEP 2: Profiling & Scoring (1-10 points each) <---
scoreFinancial: z.number().min(1).max(10), remFinancial: z.string().optional(), audioFinancial: z.string().optional(),
scoreReputation: z.number().min(1).max(10), remReputation: z.string().optional(), audioReputation: z.string().optional(),
scoreOperations: z.number().min(1).max(10), remOperations: z.string().optional(), audioOperations: z.string().optional(),
scoreDealerNetwork: z.number().min(1).max(10), remDealerNetwork: z.string().optional(), audioDealerNetwork: z.string().optional(),
scoreTeam: z.number().min(1).max(10), remTeam: z.string().optional(), audioTeam: z.string().optional(),
scorePortfolio: z.number().min(1).max(10), remPortfolio: z.string().optional(), audioPortfolio: z.string().optional(),
scoreExperience: z.number().min(1).max(10), remExperience: z.string().optional(), audioExperience: z.string().optional(),
scoreGrowth: z.number().min(1).max(10), remGrowth: z.string().optional(), audioGrowth: z.string().optional(),
redFlags: z.string().optional(), audioRedFlags: z.string().optional(),

  // ---> STEP 3: Onboarding & Infra <---
  appliedTerritory: z.array(z.string()).min(1, "At least one district is required"),
  turnoverPotential: z.string().min(1, "Turnover Potential is required"),
  currentSuppliers: z.array(z.string().min(2, "Supplier name required")).min(1, "At least one supplier is required"),
  proposedStatus: z.string().min(1, "Status required"),
  demoFarmersCommitment: z.string().min(1, "Required"),
  godownCapacity: z.string().min(1, "Capacity required"),
  coldChainFacility: z.enum(['Yes', 'No']),

  // ---> STEP 4: Dealer Network (Annexure B) <---
  topDealers: z.array(z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    contact: z.string().optional(),
    turnover: z.string().optional(),
    products: z.string().optional(),
    farmersServed: z.string().optional(),
    bioExperience: z.string().optional()
  })).optional(),

  // ---> STEP 5: Checklists <---
  glsCommitments: z.array(z.string()),
  complianceChecklist: z.array(z.string()),

  // ---> STEP 6: Media URLs <---
  documents: z.record(z.string(), z.any()).optional(),

  // ---> STEP 7: Annexures (A, C, E, F, G) <---
// ---> STEP 8: Annexures (A, C, E, F, G) <---
anxTerritories: z.array(z.object({
    state: z.string().min(2, "Required"),
    district: z.string().min(2, "Required"),
    taluka: z.string().min(2, "Required"),
    villages: z.array(z.string()).min(1, "Required"),
    cultivableArea: z.string().min(1, "Required"),
    majorCrops: z.array(z.string()).min(1, "Required")
  })).min(1, "At least one territory is required"),
  
  anxPrincipalSuppliers: z.array(z.object({
    name: z.string().min(2, "Required"),
    share: z.string().min(1, "Required")
  })).min(1, "At least one supplier is required"),
  
  anxChemicalProducts: z.array(z.string()).min(1, "Required"),
  anxBioProducts: z.array(z.string()).min(1, "Required"),
  anxOtherProducts: z.array(z.string()).min(1, "Required"),
  
  anxSupplierRefs: z.array(z.object({ 
    name: z.string().min(2, "Required"), 
    contact: z.string().regex(/^\d{10}$/, "10 digits"), 
    behavior: z.string().optional(),
    behaviorAudio: z.string().optional()
  })).min(1, "At least one reference required"),
  anxWillShareSales: z.boolean(),
  anxGrowthVision: z.string().optional(),
  anxGrowthVisionAudio: z.string().optional(),
  securityDeposit: z.string().optional(),
  paymentProofText: z.string().optional(),

  
  // ---> STEP 8: Agreement <---
  agreementAccepted: z.boolean().refine(v => v === true, "You must accept the terms to proceed"),
  distributorSignature: z.string().min(10, "Distributor signature is required"),
  seSignature: z.string().min(10, "Sales Executive signature is required"),
});

export type DistributorOnboardingValues = z.infer<typeof distributorOnboardingSchema>;