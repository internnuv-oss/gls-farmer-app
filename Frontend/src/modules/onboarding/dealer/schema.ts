import { z } from 'zod';

export const GLS_COMMITMENTS = [
  "10% clean margin on MRP", 
  "Company-funded schemes & loyalty program benefits", 
  "Support from GLS Field Executive & sales team", 
  "Access to crop-specific packages, Farm Card + Calendar", 
  "Training on products and farmer advisory"
];

export const dealerOnboardingSchema = z.object({
  // ---> STEP 1: Basic Info <---
  shopName: z.string().min(2, "Shop Name is required"),
  firmType: z.string().min(1, "Firm Type is required"),
  estYear: z.string().min(4, "Year is required"),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "City is required"),
  taluka: z.string().min(2, "Taluka is required"),
  village: z.string().min(2, "Village is required"),
  address: z.string().min(5, "Address is required"),
  landmark: z.string().optional(),

  owners: z.array(z.object({
    name: z.string().min(2, "Contact Person name is required")
  })).min(1, "At least one owner is required"),

  contactMobile: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  landlineNumber: z.string().optional().refine((val) => {
    if (!val) return true; 
    return /^[0-9]{3,5}[- ]?[0-9]{6,8}$/.test(val);
  }, "Invalid landline format (e.g., 0265-123456)"),
  
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST Format"),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN Format"),

  bankAccounts: z.array(z.object({
    accountType: z.string().min(2, "Account Type required"),
    bankName: z.string().min(2, "Bank Name required"),
    bankBranch: z.string().min(2, "Branch Name required"),
    accountName: z.string().min(2, "Account Name required"),
    accountNumber: z.string().regex(/^\d{9,18}$/, "Must be 9-18 digits"), 
    bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Format"),
  })).min(1, "At least one bank account is required"),

  // ---> STEP 2: Scoring <---
  scoreFinancial: z.number().min(1).max(10), remFinancial: z.string().optional(), audioFinancial: z.string().optional(),
  scoreReputation: z.number().min(1).max(10), remReputation: z.string().optional(), audioReputation: z.string().optional(),
  scoreOperations: z.number().min(1).max(10), remOperations: z.string().optional(), audioOperations: z.string().optional(),
  scoreFarmerNetwork: z.number().min(1).max(10), remFarmerNetwork: z.string().optional(), audioFarmerNetwork: z.string().optional(),
  scoreTeam: z.number().min(1).max(10), remTeam: z.string().optional(), audioTeam: z.string().optional(),
  scorePortfolio: z.number().min(1).max(10), remPortfolio: z.string().optional(), audioPortfolio: z.string().optional(),
  scoreExperience: z.number().min(1).max(10), remExperience: z.string().optional(), audioExperience: z.string().optional(),
  scoreGrowth: z.number().min(1).max(10), remGrowth: z.string().optional(), audioGrowth: z.string().optional(),
  redFlags: z.string().optional(), audioRedFlags: z.string().optional(),

  // ---> STEP 3: Business Details <---
  hasAdditionalLocations: z.enum(['Yes', 'No']).optional(),
  additionalShops: z.array(z.object({
    shopName: z.string().min(2, "Shop Name required"),
    estYear: z.string().min(4, "Year required"),
    state: z.string().min(2, "State required"),
    city: z.string().min(2, "City required"),
    taluka: z.string().min(2, "Taluka required"),
    village: z.string().min(2, "Village required"),
    address: z.string().min(5, "Address required"),
  })).optional(),

  godowns: z.array(z.object({
    address: z.string().min(2, "Address required"),
    capacity: z.string().min(1, "Capacity required"),
    capacityUnit: z.string().min(1, "Unit required"),
  })).optional(),

  isLinkedToDistributor: z.string().optional(),
  linkedDistributors: z.array(
    z.object({ name: z.string().min(2, "Name is required"), contact: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits") })
  ).optional(),
  
  proposedStatus: z.string().min(1, "Selection required"),
  willingDemoFarmers: z.string().min(1, "Selection required"),
  
  demoFarmers: z.array(z.object({
    name: z.string().optional(),
    contact: z.string().optional(),
    address: z.string().optional()
  })).optional(),

  // ---> STEP 4 & 5: Checklists <---
  glsCommitments: z.array(z.string()),
  complianceChecklist: z.array(z.string()),

  // ---> STEP 6: Media URLs <---
  documents: z.record(z.string(), z.any()).optional(),
  shopLocations: z.record(z.string(), z.object({ lat: z.number(), lng: z.number() })).optional(),

  // ---> STEP 7: SE Annexures <---
  seTerritories: z.array(z.object({
    taluka: z.string().min(2, "Required"),
    village: z.array(z.string()).min(1, "At least one village is required"),
    cultivableArea: z.string().min(1, "Required"),
    majorCrops: z.array(z.string()).min(1, "Required")
  })).min(1, "At least one territory is required"),
  sePrincipalSuppliers: z.array(z.string()).min(1, "Required"),
  seChemicalProducts: z.array(z.string()).min(1, "Required"),
  seBioProducts: z.array(z.string()).min(1, "Required"),
  seOtherProducts: z.array(z.string()).min(1, "Required"),
  seHasCreditReferences: z.string().optional(),
  seCreditReferences: z.array(z.object({ 
    name: z.string(), 
    contact: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits").or(z.literal("")), 
    behavior: z.string().optional(),
    behaviorAudio: z.string().optional()
  })).optional(),
  seWillShareSales: z.boolean().optional(),
  seGrowthVision: z.string().optional(),
  seGrowthVisionAudio: z.string().optional(),
  seSecurityDeposit: z.string().optional(),
  sePaymentProofText: z.string().optional(),

  // ---> STEP 8: Agreement <---
  agreementAccepted: z.boolean().refine(v => v === true, "You must accept the terms"),
  dealerSignature: z.string().min(10, "Dealer signature required"),
  seSignature: z.string().min(10, "SE signature required"),
}).superRefine((data, ctx) => {
  // If Security Deposit is entered and > 0, require at least one proof
  if (data.seSecurityDeposit && parseInt(data.seSecurityDeposit) > 0) {
    const hasTextProof = !!data.sePaymentProofText && data.sePaymentProofText.trim().length > 0;
    const hasMediaProof = !!data.documents?.['se_payment_proof'];
    
    if (!hasTextProof && !hasMediaProof) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment proof (Text ID or Media) is required when Security Deposit is entered",
        path: ["sePaymentProofText"]
      });
    }
  }
});

export type DealerOnboardingValues = z.infer<typeof dealerOnboardingSchema>;