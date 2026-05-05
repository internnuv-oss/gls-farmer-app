import { z } from 'zod';

export const farmerOnboardingSchema = z.object({
  // Personal
  fullName: z.string().min(2, "Full Name is required"),
  fatherName: z.string().min(2, "Father's/Husband's Name is required"),
  mobile: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  // 🚀 Added strict validation for alternate mobile if the user enters one
  alternateMobile: z.string().optional().refine(val => !val || /^\d{10}$/.test(val), {
    message: "Must be exactly 10 digits if provided"
  }),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "District is required"),
  taluka: z.string().min(2, "Taluka is required"),
  village: z.string().min(2, "Village is required"),

  // Farm Details
  // Farm Details
  totalLand: z.string().min(1, "Total land holding is required"),
  irrigatedLand: z.string().optional(),
  rainFedLand: z.string().optional(),
  majorCrops: z.array(z.string()).min(1, "Select at least one major crop"),
  
  // 🚀 UPDATED: soilType is now an array
  soilType: z.array(z.string()).min(1, "Select at least one soil type"),
  otherSoilType: z.string().optional(),     
  
  waterSource: z.array(z.string()).min(1, "Select at least one water source"),
  otherWaterSource: z.string().optional(),

  // History & Link
  lastCropGrown: z.string().optional(),
  yield: z.string().optional(),
  majorProblems: z.array(z.string()).optional(),
  otherProblem: z.string().optional(), // 🚀 ADDED
  dealerId: z.string().min(1, "Linking to a Dealer is required"),

  // Agreement
  agreementAccepted: z.boolean().refine(v => v === true, "Must accept agreement"),
  farmerSignature: z.string().min(10, "Farmer signature required"),
  seSignature: z.string().min(10, "SE signature required"),
});

export type FarmerOnboardingValues = z.infer<typeof farmerOnboardingSchema>;