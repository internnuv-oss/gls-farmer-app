import { z } from "zod";

export const farmerOnboardingSchema = z.object({
  // 1. Personal Details
  profilePhoto: z.string().optional(),
  fullName: z.string().min(2, "Full name is required"),
  fatherName: z.string().min(2, "Father's name is required"),
  mobile: z.string().regex(/^\d{10}$/, "Invalid mobile number"),
  alternateMobile: z.string().optional(),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "District is required"),
  taluka: z.string().min(2, "Taluka is required"),
  village: z.string().min(2, "Village is required"),
  // 🚀 NEW: Pincode Validation (Optional, but if typed, must be 6 digits)
  pincode: z.string().regex(/^\d{6}$/, "Invalid Pincode").or(z.literal('')).optional(),

  // 2. Farm Details
  landUnit: z.string().optional(),
  totalLand: z.string().min(1, "Total land is required"),
  irrigatedLand: z.string().optional(),
  rainFedLand: z.string().optional(),
  majorCrops: z.array(z.string()).min(1, "Select at least one major crop"),
  soilType: z.array(z.string()).min(1, "Select at least one soil type"),
  otherSoilType: z.string().optional(),
  waterSource: z.array(z.string()).min(1, "Select at least one water source"),
  otherWaterSource: z.string().optional(),
  
  irrigationType: z.array(z.string()).optional(),
  isIntercropping: z.string().optional(),
  farmEquipments: z.array(z.string()).optional(),
  otherFarmEquipment: z.string().optional(),
  biofertilizer: z.string().optional(),
  sideTrees: z.array(z.object({
    type: z.string().optional(),
    quantity: z.string().optional()
  })).optional(),
  cattles: z.array(z.object({
    type: z.string().optional(),
    quantity: z.string().optional()
  })).optional(),

  // 3. History & Linking
  pastCrops: z.array(z.object({
    cropName: z.string().optional(),
    area: z.string().optional(),
    areaUnit: z.string().optional(),
    inputUsed: z.array(z.string()).optional(), 
    otherInputUsed: z.string().optional(),
    yield: z.string().optional(),
    yieldUnit: z.string().optional(),
    problemsFaced: z.string().optional()
  })).optional(),
  dealerId: z.string().optional(), 

  // 4. Signatures
  agreementAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms & conditions",
  }),
  farmerSignature: z.string().min(5, "Farmer signature is required"),
  seSignature: z.string().min(5, "Sales Executive signature is required"),
});

export type FarmerOnboardingValues = z.infer<typeof farmerOnboardingSchema>;