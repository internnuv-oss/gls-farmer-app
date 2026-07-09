import { z } from "zod";

// 🚀 NEW: Define the options that trigger the "Other" input
const OTHER_CROP_OPTIONS = ["Other Cereals", "Other Pulses", "Other Oilseeds"];

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
  pincode: z.string().regex(/^\d{6}$/, "Invalid Pincode").or(z.literal('')).optional(),

  // 2. Farm Details
  landUnit: z.string().optional(),
  irrigatedLandUnit: z.string().optional(),
  rainFedLandUnit: z.string().optional(),
  totalLand: z.string().min(1, "Total land is required"),
  irrigatedLand: z.string().optional(),
  rainFedLand: z.string().optional(),
  majorCrops: z.array(z.string()).min(1, "Select at least one major crop"),
  otherCrops: z.string().optional(),
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
  pastCrops: z.array(
    z.object({
      cropName: z.string().optional(),
      otherCropName: z.string().optional(), // 🚀 NEW FIELD
      area: z.string().optional(),
      areaUnit: z.string().optional(),
      inputUsed: z.array(z.string()).optional(), 
      otherInputUsed: z.string().optional(),
      yield: z.string().optional(),
      yieldUnit: z.string().optional(),
      problemsFaced: z.string().optional()
    }).superRefine((val, ctx) => {
      // 🚀 Enforce Compulsory Other Crop Name in Step 3
      if (val.cropName && OTHER_CROP_OPTIONS.includes(val.cropName) && (!val.otherCropName || val.otherCropName.trim() === '')) {
        ctx.addIssue({
          code: "custom",
          message: "Please specify the crop name",
          path: ["otherCropName"]
        });
      }
    })
  ).optional(),
  dealerId: z.string().optional(), 

  // 4. Signatures
  agreementAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms & conditions",
  }),
  farmerSignature: z.string().min(5, "Farmer signature is required"),
  seSignature: z.string().min(5, "Sales Executive signature is required"),
}).superRefine((data, ctx) => {
  
  // 🚀 1. Enforce Compulsory Other Crop Name in Step 2
  const hasOtherMajorCrop = data.majorCrops?.some(crop => OTHER_CROP_OPTIONS.includes(crop));
  if (hasOtherMajorCrop && (!data.otherCrops || data.otherCrops.trim() === '')) {
    ctx.addIssue({
      code: "custom",
      message: "Please specify the other crop(s)",
      path: ["otherCrops"]
    });
  }

  // 🚀 2. Enforce Land Area Math (Only if units match to avoid false Acre vs Bigha positives)
  if (data.totalLand && data.landUnit === data.irrigatedLandUnit && data.landUnit === data.rainFedLandUnit) {
    const total = parseFloat(data.totalLand) || 0;
    const irr = parseFloat(data.irrigatedLand || '0');
    const rain = parseFloat(data.rainFedLand || '0');

    if (irr + rain > total) {
      ctx.addIssue({
        code: "custom", 
        message: "Exceeds Total Land",
        path: ["irrigatedLand"]
      });
      ctx.addIssue({
        code: "custom", 
        message: "Exceeds Total Land",
        path: ["rainFedLand"]
      });
    }
  }
});

export type FarmerOnboardingValues = z.infer<typeof farmerOnboardingSchema>;