// Frontend/src/modules/onboarding/fpo/schema.ts
import { z } from 'zod';

export const FPO_GLS_COMMITMENTS = [
  "Fair Margin Structure: Clean 10% operational margin on the FPO Landing Rate.",
  "Farmer-First Field Support: GLS field team to drive 60% of demand generation.",
  "Dedicated Field Personnel: Dedicated GLS Field Executives assigned.",
  "Input-to-Output Support: Supply of specialized crop packages and Farm Cards.",
  "100% Funded Demos: Product demonstration kits and training funded by GLS."
];

export const FPO_COMPLIANCE_ITEMS = [
  "Copy of Incorporation Certificate (ROC / Cooperative Society)",
  "Valid FCO Authorization / Retail Fertilizer License",
  "Valid Insecticide Selling License",
  "Copy of FPO PAN Card & GST Registration Certificate",
  "Cancelled Cheque from the FPO's official bank account",
  "Board Resolution copy authorizing this partnership",
  "Last 2 years Audited Balance Sheet / Financial Statement"
];

export const fpoOnboardingSchema = z.object({
  // ---> STEP 1: Basic Info <---
  fpoName: z.string().min(2, "FPO Name is required"),
  registrationNumber: z.string().min(2, "Registration Number is required"),
  incorporationYear: z.string().min(4, "Incorporation Year is required"),
  
  address: z.string().min(5, "Registered Office Address is required"),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "District is required"),
  taluka: z.string().min(2, "Taluka is required"),
  pincode: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
  commandArea: z.string().min(2, "Command Area is required"),

  ceoName: z.string().min(2, "CEO / MD Name is required"),
  bodPresidentName: z.string().min(2, "BoD President Name is required"),
  contactMobile: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST Format").optional().or(z.literal("")),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN Format").optional().or(z.literal("")),
  promotingAgency: z.string().min(2, "Promoting Agency is required"),

  bankAccounts: z.array(z.object({
    isActive: z.boolean().optional(),
    accountName: z.string().min(2, "Account Name required"),
    accountNumber: z.string().regex(/^\d{9,18}$/, "Must be 9-18 digits"), 
    bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Format"),
    bankNameBranch: z.string().min(2, "Bank Name & Branch required"),
  })).min(1, "At least one bank account is required"),

  // ---> STEP 2: Profiling & Scoring <---
  scoreMemberBase: z.number().min(1).max(10), remMemberBase: z.string().optional(), audioMemberBase: z.string().optional(),
  scoreFinancial: z.number().min(1).max(10), remFinancial: z.string().optional(), audioFinancial: z.string().optional(),
  scoreGovernance: z.number().min(1).max(10), remGovernance: z.string().optional(), audioGovernance: z.string().optional(),
  scoreInfra: z.number().min(1).max(10), remInfra: z.string().optional(), audioInfra: z.string().optional(),
  scoreDistribution: z.number().min(1).max(10), remDistribution: z.string().optional(), audioDistribution: z.string().optional(),
  scoreAggregation: z.number().min(1).max(10), remAggregation: z.string().optional(), audioAggregation: z.string().optional(),
  scoreBiologicals: z.number().min(1).max(10), remBiologicals: z.string().optional(), audioBiologicals: z.string().optional(),
  scoreExtension: z.number().min(1).max(10), remExtension: z.string().optional(), audioExtension: z.string().optional(),
  scoreDigital: z.number().min(1).max(10), remDigital: z.string().optional(), audioDigital: z.string().optional(),
  scoreAlignment: z.number().min(1).max(10), remAlignment: z.string().optional(), audioAlignment: z.string().optional(),
  redFlags: z.string().optional(), audioRedFlags: z.string().optional(),

  // ---> STEP 3: Business & Infra <---
  allottedTerritories: z.array(
    z.object({
      district: z.string().min(1, "District is required"),
      taluka: z.string().min(1, "Taluka is required"),
      villages: z.array(z.string()).min(1, "Select at least one village")
    })
  ).min(1, "Add at least one operational territory"),
  expectedOfftake: z.string().min(1, "Required"),
  currentSuppliers: z.array(z.string()).optional(),
  partnershipTier: z.string().min(2, "Required"),
  demoFarmersCommitment: z.string().min(1, "Required"),
  
  warehouseSpace: z.string().optional(),
  storageConditions: z.string().optional(),
  customMachinery: z.string().optional(),

  // ---> STEP 4: Member Base & Network (Annexures A & B) <---
  totalMembers: z.string().min(1, "Required"),
  activeMembers: z.string().min(1, "Required"),
  majorCrops: z.array(z.object({ 
    name: z.string().min(2, "Required"), 
    acreage: z.string().min(1, "Required") 
  })).min(1, "At least one crop required"),
  kharifDemand: z.string().optional(),
  rabiDemand: z.string().optional(),



  // ---> STEP 5 & 6: Checklists <---
  glsCommitments: z.array(z.string()),
  complianceChecklist: z.array(z.string()),

  // ---> STEP 7: Documents & Locations <---
  documents: z.record(z.string(), z.any()).optional(),
  storageLocations: z.record(z.string(), z.object({ lat: z.number(), lng: z.number() })).optional(),

  // ---> STEP 8: Agreement <---
  agreementAccepted: z.boolean().refine(v => v === true, "You must accept the terms"),
  fpoSignature: z.string().min(10, "FPO signature is required"),
  seSignature: z.string().min(10, "SE signature is required")
});

export type FPOOnboardingValues = z.infer<typeof fpoOnboardingSchema>;