// src/modules/FarmCard/schema.ts
import { z } from 'zod';

export const farmCardSchema = z.object({
  farmerId: z.string().optional(),
  
  farmerName: z.string().optional(),
  mobileNumber: z.string().optional(),
  primaryWhatsapp: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  taluka: z.string().optional(),
  village: z.string().optional(),
  educationLevel: z.string().optional(),
  farmingExperience: z.string().optional(),
  familyMembers: z.string().optional(),
  labourType: z.string().optional(),

  // Removed farmName
  fieldNumber: z.string().optional(),
  plotNumber: z.string().optional(),
  surveyNo: z.string().optional(),
  totalLandArea: z.string().optional(),
  totalLandAreaUnit: z.string().optional(),
  cultivatedArea: z.string().optional(),
  cultivatedAreaUnit: z.string().optional(),
  fsppCommittedArea: z.string().optional(), // Removed refine hard block
  fsppCommittedAreaUnit: z.string().optional(),
  legalOwnerName: z.string().optional(),
  landStatus: z.string().optional(),

  soilType: z.string().optional(),
  soilPh: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 14;
    }, "pH must be between 0 and 14"),
  soilEc: z.string().optional(),
  organicMatter: z.string().optional(),
  nitrogen: z.string().optional(),
  phosphorus: z.string().optional(),
  potassium: z.string().optional(),
  drainageCondition: z.string().optional(),
  soilTestStatus: z.string().optional(),
  soilTestDate: z.string().optional(), // Added Soil Test Date

  waterSource: z.array(z.string()).optional(),
  irrigationMethod: z.array(z.string()).optional(),
  waterAvailability: z.string().optional(),
  irrigationFrequency: z.string().optional(),
  waterTds: z.record(z.string(), z.string()).optional(),
  waterPh: z.record(z.string(), z.string()).optional(),
  pumpHp: z.string().optional(),
  dripArea: z.string().optional(),
  dripAreaUnit: z.string().optional(),

  yieldHistory: z.array(z.object({
    year: z.string().optional(), // Split Year
    season: z.string().optional(), // Split Season
    cropGrown: z.string().optional(),
    area: z.string().optional(),
    areaUnit: z.string().optional(),
    inputCost: z.string().optional(),
    total20kg: z.string().optional(),
    yieldQtl: z.string().optional(),
    priceQtl: z.string().optional(),
  })).optional(),

  preferredChemFert: z.array(z.string()).optional(),
  preferredChemCrop: z.array(z.string()).optional(),
  currentBioBrands: z.array(z.string()).optional(), // 🚀 Changed to Array
  decisionFactor: z.string().optional(),
  primarySalesChannel: z.array(z.string()).optional(),
  distanceToMarket: z.string().optional(),
  transportMethod: z.array(z.string()).optional(),
  paymentCycle: z.array(z.string()).optional(),
  tractorOwnership: z.array(z.string()).optional(),
  sowingEquipment: z.array(z.string()).optional(),
  sprayEquipment: z.array(z.string()).optional(),
  tillageMachinery: z.array(z.string()).optional(),

  milchCows: z.string().optional(),
  buffaloes: z.string().optional(),
  draftAnimals: z.string().optional(),
  goatsSheepPoultry: z.string().optional(),
  fymGenerated: z.string().optional(),
  fymHandlingMethod: z.string().optional(),
  cropResidueManagement: z.string().optional(),
  compostEnrichmentWillingness: z.string().optional(),

  waterBorneRunoffRisk: z.string().optional(),
  airborneSprayDriftRisk: z.string().optional(),
  edgePlantationPresent: z.string().optional(),
  biologicalCropBarrier: z.string().optional(),
  dominantPestVector: z.string().optional(),

  digitalAdoption: z.array(z.string()).optional(),

  boundary_polygon: z.array(z.object({
    latitude: z.number(),
    longitude: z.number()
  })).optional(),

  documents: z.object({
    field_boundary: z.string().optional(),
    soil_squeeze: z.string().optional(),
    lab_report: z.string().optional(),
  }).optional(),
  media_gps: z.record(z.string(), z.any()).optional(),
}).superRefine((data, ctx) => {
  // Only compare if the units match to prevent false positives when mixing Acres and Bigha
  if (data.totalLandArea && data.cultivatedArea && data.totalLandAreaUnit === data.cultivatedAreaUnit) {
    const total = parseFloat(data.totalLandArea);
    const cult = parseFloat(data.cultivatedArea);
    if (!isNaN(total) && !isNaN(cult) && cult > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot exceed Total Area",
        path: ["cultivatedArea"]
      });
    }
  }
});

export type FarmCardValues = z.infer<typeof farmCardSchema>;