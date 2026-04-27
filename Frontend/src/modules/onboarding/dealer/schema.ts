import { z } from 'zod';

export const GLS_COMMITMENTS = [
  "10% clean margin on MRP", 
  "Company-funded schemes & loyalty program benefits", 
  "Support from GLS Field Executive & sales team", 
  "Access to crop-specific packages, Farm Card + Calendar", 
  "Training on products and farmer advisory"
];

export const dealerOnboardingSchema = z.object({
  shopName: z.string().min(2, "Shop Name is required"),
  ownerName: z.string().min(2, "Contact Person is required"),
  contactMobile: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  state: z.string().min(2, "State is required"), // NEW
  city: z.string().min(2, "City is required"),   // NEW
  taluka: z.string().min(2, "Taluka is required"),   // NEW
  village: z.string().min(2, "Village is required"),
  address: z.string().min(5, "Address is required"),
  landmark: z.string().optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST Format"),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN Format"),
  estYear: z.string().min(4, "Year is required"),
  firmType: z.string().min(1, "Firm Type is required"),
  bankAccountName: z.string().min(2, "Account Name required"),
  bankAccountNumber: z.string().regex(/^\d{9,18}$/, "Must be 9-18 digits"), // Validates Exact Digits
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Format"),
  bankName: z.string().min(2, "Bank Name required"),
  bankBranch: z.string().min(2, "Branch Name required"),

  // Step 2: Scoring
  scoreFinancial: z.number().min(1).max(10), remFinancial: z.string().optional(), audioFinancial: z.string().optional(),
  scoreReputation: z.number().min(1).max(10), remReputation: z.string().optional(), audioReputation: z.string().optional(),
  scoreOperations: z.number().min(1).max(10), remOperations: z.string().optional(), audioOperations: z.string().optional(),
  scoreFarmerNetwork: z.number().min(1).max(10), remFarmerNetwork: z.string().optional(), audioFarmerNetwork: z.string().optional(),
  scoreTeam: z.number().min(1).max(10), remTeam: z.string().optional(), audioTeam: z.string().optional(),
  scorePortfolio: z.number().min(1).max(10), remPortfolio: z.string().optional(), audioPortfolio: z.string().optional(),
  scoreExperience: z.number().min(1).max(10), remExperience: z.string().optional(), audioExperience: z.string().optional(),
  scoreGrowth: z.number().min(1).max(10), remGrowth: z.string().optional(), audioGrowth: z.string().optional(),
  redFlags: z.string().optional(), audioRedFlags: z.string().optional(),

  // Step 3: Business Details
  isLinkedToDistributor: z.string().optional(),
  linkedDistributors: z.array(
    z.object({ 
      name: z.string().min(2, "Name is required"), 
      contact: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits") 
    })
  ).optional(),
  majorCrops: z.array(z.string()).min(1, "Add at least one crop"),
  acresServed: z.string().optional(),
  proposedStatus: z.string().min(1, "Selection required"),
  willingDemoFarmers: z.string().min(1, "Selection required"),

  // Step 4 & 5: Checklists
  glsCommitments: z.array(z.string()),
  complianceChecklist: z.array(z.string()),

  // Step 6: Media URLs
  documents: z.record(z.string(), z.any()).optional(),
  shopLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),

  // ---> NEW STEP 7: SE Annexures <---
  seTalukasCovered: z.array(z.string()).min(1, "Required"),
  seVillagesCovered: z.array(z.string()).min(1, "Required"),
  seTotalCultivableArea: z.string().min(1, "Required"),
  seTotalCultivableAreaUnit: z.string().optional(),
  seMajorCrops: z.array(z.string()).min(1, "Required"),
  sePrincipalSuppliers: z.array(z.string()).min(1, "Required"),
  seChemicalProducts: z.array(z.string()).min(1, "Required"),
  seBioProducts: z.array(z.string()).min(1, "Required"),
  seOtherProducts: z.array(z.string()).min(1, "Required"),
  seGodownCapacity: z.string().optional(),
  seGodownCapacityUnit: z.string().optional(),
  seHasCreditReferences: z.string().optional(),
  seCreditReferences: z.array(z.object({ 
    name: z.string(), 
    contact: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits").or(z.literal("")), 
    behavior: z.string().optional(),
    behaviorAudio: z.string().optional()
  })).optional(),
  seWillShareSales: z.boolean().refine(v => v === true, "Must confirm sales reporting"),
  seGrowthVision: z.string().optional(),
  seGrowthVisionAudio: z.string().optional(),
  seSecurityDeposit: z.string().optional(),
  // -----------------------------------

  // Step 7: Agreement
  agreementAccepted: z.boolean().refine(v => v === true, "You must accept the terms"),
  dealerSignature: z.string().min(10, "Dealer signature required"),
  seSignature: z.string().min(10, "SE signature required"),
});

export type DealerOnboardingValues = z.infer<typeof dealerOnboardingSchema>;