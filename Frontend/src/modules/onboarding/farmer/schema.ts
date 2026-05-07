import { z } from "zod";

export const farmerOnboardingSchema = z.object({
  // 1. Personal Details
  fullName: z.string().min(2, "Full name is required"),
  fatherName: z.string().min(2, "Father's name is required"),
  mobile: z.string().regex(/^\d{10}$/, "Invalid mobile number"),
  alternateMobile: z.string().optional(),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "District is required"),
  taluka: z.string().min(2, "Taluka is required"),
  village: z.string().min(2, "Village is required"),

  // 2. Farm Details
  landUnit: z.string().optional(), // 🚀 NEW
  totalLand: z.string().min(1, "Total land is required"),
  irrigatedLand: z.string().optional(),
  rainFedLand: z.string().optional(),
  majorCrops: z.array(z.string()).min(1, "Select at least one major crop"),
  soilType: z.array(z.string()).min(1, "Select at least one soil type"),
  otherSoilType: z.string().optional(),
  waterSource: z.array(z.string()).min(1, "Select at least one water source"),
  otherWaterSource: z.string().optional(),
  
  // 🚀 NEW OPTIONAL FARM DETAILS
  irrigationType: z.string().optional(),
  isIntercropping: z.string().optional(),
  sideTrees: z.array(z.object({
    type: z.string().optional(),
    quantity: z.string().optional()
  })).optional(),
  cattles: z.array(z.object({
    type: z.string().optional(),
    quantity: z.string().optional()
  })).optional(),

  // 3. History & Linking
  lastCropGrown: z.string().optional(),
  yield: z.string().optional(),
  majorProblems: z.array(z.string()).optional(),
  otherProblem: z.string().optional(),
  dealerId: z.string().optional(), // 🚀 Dealer is now optional

  // 4. Signatures
  agreementAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms & conditions",
  }),
  farmerSignature: z.string().min(5, "Farmer signature is required"),
  seSignature: z.string().min(5, "Sales Executive signature is required"),
});

export type FarmerOnboardingValues = z.infer<typeof farmerOnboardingSchema>;