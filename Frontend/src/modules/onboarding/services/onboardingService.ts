import { supabase } from "../../../core/supabase";
import { DealerOnboardingValues } from "../dealer/schema";
import { FarmerOnboardingValues } from "../farmer/schema";
import { DistributorOnboardingValues } from "../distributor/schema";

export async function saveDealerOnboarding(
  payload: DealerOnboardingValues, 
  status: "DRAFT" | "SUBMITTED",
  totalScore: number,
  recommendation: string,
  seId: string,
  existingId?: string
) {

  const dbPayload = {
    se_id: seId,
    primary_shop_name: payload.shopName, // Renamed column
    proposed_status: payload.proposedStatus,
    contact_person: payload.owners[0]?.name || '', // Renamed column (First owner)
    owners_list: payload.owners,
    contact_mobile: payload.contactMobile,
    landline_number: payload.landlineNumber,
    primary_address: payload.address, // Renamed column
    primary_shop_location: { // New JSONB structure
      state: payload.state,
      city: payload.city,
      taluka: payload.taluka,
      village: payload.village,
      gps: {
        exterior: payload.shopLocations?.['shop_exterior'] || null,
        interior: payload.shopLocations?.['shop_interior'] || null
      }
    },
    landmark: payload.landmark,
    gst_number: payload.gstNumber,
    pan_number: payload.panNumber,
    est_year: payload.estYear,
    firm_type: payload.firmType,
    bank_details: payload.bankAccounts,
  
    additional_locations: {
      hasAdditionalLocations: payload.hasAdditionalLocations,
      shops: payload.additionalShops,
      godowns: payload.godowns,
      godown_gps: payload.shopLocations?.['shop_godown'] || null // Specific GPS for godowns
    },
    distributor_links: {
      isLinked: payload.isLinkedToDistributor,
      distributors: payload.linkedDistributors
    },
    demo_farmers_data: {
      willing: payload.willingDemoFarmers,
      media_url: payload.documents?.['demo_farmers_list'] || null, // Cloudinary link for media
      farmers: payload.demoFarmers
    },
  
    commitments: {
      glsCommitments: payload.glsCommitments,
      complianceChecklist: payload.complianceChecklist,
    },
  
    scoring: {
      financial: payload.scoreFinancial,
      reputation: payload.scoreReputation,
      operations: payload.scoreOperations,
      farmerNetwork: payload.scoreFarmerNetwork,
      team: payload.scoreTeam,
      portfolio: payload.scorePortfolio,
      experience: payload.scoreExperience,
      growth: payload.scoreGrowth,
      remarks: {
        financial: payload.remFinancial,
        reputation: payload.remReputation,
        operations: payload.remOperations,
        farmerNetwork: payload.remFarmerNetwork,
        team: payload.remTeam,
        portfolio: payload.remPortfolio,
        experience: payload.remExperience,
        growth: payload.remGrowth,
      },
      audio: {
        financial: payload.audioFinancial,
        reputation: payload.audioReputation,
        operations: payload.audioOperations,
        farmerNetwork: payload.audioFarmerNetwork,
        team: payload.audioTeam,
        portfolio: payload.audioPortfolio,
        experience: payload.audioExperience,
        growth: payload.audioGrowth,
        redFlags: payload.audioRedFlags,
      },
      redFlags: payload.redFlags,
    },
    total_score: totalScore,
    category: recommendation, // Renamed column
    documents: payload.documents || {},
    annexures: {
      territories: payload.seTerritories,
      principalSuppliers: payload.sePrincipalSuppliers,
      chemicalProducts: payload.seChemicalProducts,
      bioProducts: payload.seBioProducts,
      otherProducts: payload.seOtherProducts,
      hasCreditReferences: payload.seHasCreditReferences,
      creditReferences: payload.seCreditReferences,
      willShareSales: payload.seWillShareSales,
      growthVision: payload.seGrowthVision,
      growthVisionAudio: payload.seGrowthVisionAudio,
      securityDeposit: payload.seSecurityDeposit,
      paymentProofText: payload.sePaymentProofText,
    },
    dealer_signature: payload.dealerSignature,
    se_signature: payload.seSignature,
    status: status,
    updated_at: new Date().toISOString()
  };

  let query = supabase.from("dealers");
  let result;
  
  if (existingId) {
    result = await query.update(dbPayload).eq('id', existingId).select().single();
  } else {
    result = await query.insert([dbPayload]).select().single();
  }

  if (result.error) throw result.error;
  return result.data;
}

export function mapDealerDbToForm(db: any): DealerOnboardingValues {
  // Extract distributors and linkage status from the new distributor_links JSONB column
  const distributors = db.distributor_links?.distributors || [];
  const isLinked = db.distributor_links?.isLinked || "No";

  // Reconstruct the owners array from owners_list (renamed from owners)
  const owners = db.owners_list || [{ name: "" }];

  // Ensure villages within territories are treated as arrays (multiselect requirement)
  const seTerritories = db.annexures?.territories?.map((t: any) => ({
    ...t,
    village: Array.isArray(t.village) ? t.village : (t.village ? [t.village] : [])
  })) || [{ taluka: '', village: [], cultivableArea: '', majorCrops: [] }];

  // ---> ADDED: Safely build shopLocations without passing `null` to Zod <---
  const mappedShopLocations: Record<string, { lat: number, lng: number }> = {};
  if (db.primary_shop_location?.gps?.exterior) mappedShopLocations['shop_exterior'] = db.primary_shop_location.gps.exterior;
  if (db.primary_shop_location?.gps?.interior) mappedShopLocations['shop_interior'] = db.primary_shop_location.gps.interior;
  if (db.additional_locations?.godown_gps) mappedShopLocations['shop_godown'] = db.additional_locations.godown_gps;

  return {
    // 1. Basic Info
    shopName: db.primary_shop_name || "",
    firmType: db.firm_type || "",
    estYear: db.est_year || "",
    
    // 2. Location
    state: db.primary_shop_location?.state || "",
    city: db.primary_shop_location?.city || "",
    taluka: db.primary_shop_location?.taluka || "",
    village: db.primary_shop_location?.village || [], 
    address: db.primary_address || "",
    landmark: db.landmark || "",

    // 3. GPS - Using the safely mapped object
    shopLocations: mappedShopLocations,

    owners: owners,
    contactMobile: db.contact_mobile || "",
    landlineNumber: db.landline_number || "",
    gstNumber: db.gst_number || "",
    panNumber: db.pan_number || "",
    bankAccounts: db.bank_details || [{ accountType: '', bankName: '', bankBranch: '', accountName: '', accountNumber: '', bankIfsc: '' }],

    // 4. Additional Locations
    hasAdditionalLocations: db.additional_locations?.hasAdditionalLocations || "No",
    additionalShops: db.additional_locations?.shops || [],
    godowns: db.additional_locations?.godowns || [],

    // 5. Scoring & Remarks
    scoreFinancial: db.scoring?.financial || 5, 
    remFinancial: db.scoring?.remarks?.financial || "",
    scoreReputation: db.scoring?.reputation || 5, 
    remReputation: db.scoring?.remarks?.reputation || "",
    scoreOperations: db.scoring?.operations || 5, 
    remOperations: db.scoring?.remarks?.operations || "",
    scoreFarmerNetwork: db.scoring?.farmerNetwork || 5, 
    remFarmerNetwork: db.scoring?.remarks?.farmerNetwork || "",
    scoreTeam: db.scoring?.team || 5, 
    remTeam: db.scoring?.remarks?.team || "",
    scorePortfolio: db.scoring?.portfolio || 5, 
    remPortfolio: db.scoring?.remarks?.portfolio || "",
    scoreExperience: db.scoring?.experience || 5, 
    remExperience: db.scoring?.remarks?.experience || "",
    scoreGrowth: db.scoring?.growth || 5, 
    remGrowth: db.scoring?.remarks?.growth || "",
    redFlags: db.scoring?.redFlags || "",

    // 6. Audio Evidence
    audioFinancial: db.scoring?.audio?.financial || "",
    audioReputation: db.scoring?.audio?.reputation || "",
    audioOperations: db.scoring?.audio?.operations || "",
    audioFarmerNetwork: db.scoring?.audio?.farmerNetwork || "",
    audioTeam: db.scoring?.audio?.team || "",
    audioPortfolio: db.scoring?.audio?.portfolio || "",
    audioExperience: db.scoring?.audio?.experience || "",
    audioGrowth: db.scoring?.audio?.growth || "",
    audioRedFlags: db.scoring?.audio?.redFlags || "",

    // 7. Business Linkages & Demo Farmers
    isLinkedToDistributor: isLinked,
    linkedDistributors: isLinked === 'Yes' ? (distributors.length > 0 ? distributors : [{ name: '', contact: '' }]) : [],
    proposedStatus: db.proposed_status || "",
    willingDemoFarmers: db.demo_farmers_data?.willing || "No",
    demoFarmers: db.demo_farmers_data?.farmers || [],

    // 8. Commitments, Compliance & Documents
    glsCommitments: db.commitments?.glsCommitments || [],
    complianceChecklist: db.commitments?.complianceChecklist || [],
    documents: db.documents || {},

    // 9. Annexures (SE Evaluated)
    seTerritories: seTerritories,
    sePrincipalSuppliers: db.annexures?.principalSuppliers || [],
    seChemicalProducts: db.annexures?.chemicalProducts || [],
    seBioProducts: db.annexures?.bioProducts || [],
    seOtherProducts: db.annexures?.otherProducts || [],
    seHasCreditReferences: db.annexures?.hasCreditReferences || "No",
    seCreditReferences: db.annexures?.creditReferences || [],
    seWillShareSales: db.annexures?.willShareSales || false,
    seGrowthVision: db.annexures?.growthVision || "",
    seGrowthVisionAudio: db.annexures?.growthVisionAudio || "",
    seSecurityDeposit: db.annexures?.securityDeposit || "",
    sePaymentProofText: db.annexures?.paymentProofText || "",

    // 10. Agreement & Signatures
    agreementAccepted: true,
    dealerSignature: db.dealer_signature || "",
    seSignature: db.se_signature || "",
  };
}

export async function updateDealerPdfUrl(id: string, pdfUrl: string) {
  const { error } = await supabase.from("dealers").update({ pdf_url: pdfUrl }).eq("id", id);
  if (error) throw error;
}



export async function saveFarmerOnboarding(
  payload: FarmerOnboardingValues,
  seId: string,
  existingId?: string
) {
  // 1. Format dynamic arrays correctly
  const formattedPastCrops = (payload.pastCrops || []).map((c) => ({
    cropName: c.cropName,
    area: c.area,
    areaUnit: c.areaUnit,
    inputUsed: (c.inputUsed || []).map((i) => (i === "Others" ? c.otherInputUsed : i)),
    yield: c.yield,
    yieldUnit: c.yieldUnit,
    problemsFaced: c.problemsFaced,
  }));

  const dbPayload = {
    se_id: seId,
    dealer_id: payload.dealerId || null,
    full_name: payload.fullName,
    mobile: payload.mobile,
    village: payload.village,
    personal_details: {
      profilePhoto: payload.profilePhoto,
      fatherName: payload.fatherName,
      alternateMobile: payload.alternateMobile,
      state: payload.state,
      city: payload.city,
      taluka: payload.taluka,
      pincode: payload.pincode,
      village: payload.village,
    },
    farm_details: {
      totalLand: payload.totalLand,
      irrigatedLand: payload.irrigatedLand,
      rainFedLand: payload.rainFedLand,
      majorCrops: payload.majorCrops,
      soilType: payload.soilType.map((st) => (st === "Others" ? payload.otherSoilType : st)),
      waterSource: payload.waterSource.map((ws) => (ws === "Others" ? payload.otherWaterSource : ws)),
      landUnit: payload.landUnit || "Acres",
      irrigationType: payload.irrigationType || [],
      farmEquipments: (payload.farmEquipments || []).map((e) => (e === "Others" ? payload.otherFarmEquipment : e)),
      biofertilizer: payload.biofertilizer,
      isIntercropping: payload.isIntercropping,
      // Filter out empty rows where user clicked "Add" but didn't type anything
      sideTrees: (payload.sideTrees || []).filter(t => t.type && t.quantity),
      cattles: (payload.cattles || []).filter(c => c.type && c.quantity),
    },
    history_details: { pastCrops: formattedPastCrops },
    farmer_signature: payload.farmerSignature,
    se_signature: payload.seSignature,
    status: "SUBMITTED",
    updated_at: new Date().toISOString(),
  };

  let query = supabase.from("farmers");
  let result;

  if (existingId) {
    result = await query.update(dbPayload).eq("id", existingId).select("id").single();
  } else {
    result = await query.insert([dbPayload]).select("id").single();
  }

  if (result.error) throw result.error;
  return result.data;
}

export function mapFarmerDbToForm(db: any): FarmerOnboardingValues {
  const PREDEFINED_SOILS = ["Black", "Sandy", "Red", "Loamy"];
  const PREDEFINED_WATER = ["Canal", "Borewell", "Rain", "Tube-well", "Well", "Tank", "Pond", "River"];
  const PREDEFINED_EQUIPMENTS = ["Mini Tractor", "Tractor", "Cultivation Equipments"];
  const PREDEFINED_INPUTS = ["DAP", "Urea", "NPK", "SSP", "MOP", "Compost"];

  const dbSoil = db.farm_details?.soilType || [];
  const knownSoil = dbSoil.filter((s: string) => PREDEFINED_SOILS.includes(s));
  const otherSoil = dbSoil.find((s: string) => !PREDEFINED_SOILS.includes(s));
  if (otherSoil) knownSoil.push("Others");

  const dbWater = db.farm_details?.waterSource || [];
  const knownWater = dbWater.filter((w: string) => PREDEFINED_WATER.includes(w));
  const otherWater = dbWater.find((w: string) => !PREDEFINED_WATER.includes(w));
  if (otherWater) knownWater.push("Others");

  const dbEquip = db.farm_details?.farmEquipments || [];
  const knownEquip = dbEquip.filter((e: string) => PREDEFINED_EQUIPMENTS.includes(e));
  const otherEquip = dbEquip.find((e: string) => !PREDEFINED_EQUIPMENTS.includes(e));
  if (otherEquip) knownEquip.push("Others");

  return {
    profilePhoto: db.personal_details?.profilePhoto || "",
    fullName: db.full_name || "",
    fatherName: db.personal_details?.fatherName || "",
    mobile: db.mobile || "",
    alternateMobile: db.personal_details?.alternateMobile || "",
    state: db.personal_details?.state || "",
    city: db.personal_details?.city || "",
    taluka: db.personal_details?.taluka || "",
    village: db.village || "",
    pincode: db.personal_details?.pincode || "",
    totalLand: db.farm_details?.totalLand || "",
    irrigatedLand: db.farm_details?.irrigatedLand || "",
    rainFedLand: db.farm_details?.rainFedLand || "",
    majorCrops: db.farm_details?.majorCrops || [],
    soilType: knownSoil,
    otherSoilType: otherSoil || "",
    waterSource: knownWater,
    otherWaterSource: otherWater || "",
    landUnit: db.farm_details?.landUnit || "Acres",
    irrigationType: Array.isArray(db.farm_details?.irrigationType) ? db.farm_details.irrigationType : [],
    farmEquipments: knownEquip,
    otherFarmEquipment: otherEquip || "",
    biofertilizer: db.farm_details?.biofertilizer || "",
    isIntercropping: db.farm_details?.isIntercropping || undefined,
    sideTrees: db.farm_details?.sideTrees || [],
    cattles: db.farm_details?.cattles || [],
    pastCrops:
      (db.history_details?.pastCrops || []).length > 0
        ? db.history_details.pastCrops.map((c: any) => {
            const dbInputs = Array.isArray(c.inputUsed) ? c.inputUsed : c.inputUsed ? [c.inputUsed] : [];
            const knownInputs = dbInputs.filter((i: string) => PREDEFINED_INPUTS.includes(i));
            const otherInputs = dbInputs.filter((i: string) => !PREDEFINED_INPUTS.includes(i));
            if (otherInputs.length > 0) knownInputs.push("Others");
            return {
              ...c,
              inputUsed: knownInputs,
              otherInputUsed: otherInputs.join(", "),
              yieldUnit: c.yieldUnit || "Quintals",
            };
          })
        : [{ cropName: "", area: "", areaUnit: "Acres", inputUsed: [], otherInputUsed: "", yield: "", yieldUnit: "Quintals", problemsFaced: "" }],
    dealerId: db.dealer_id || "",
    agreementAccepted: true,
    farmerSignature: db.farmer_signature || "",
    seSignature: db.se_signature || "",
  };
}

export async function updateFarmerPdfUrl(id: string, pdfUrl: string) {
  const { error } = await supabase.from("farmers").update({ pdf_url: pdfUrl }).eq("id", id);
  if (error) throw error;
}




// ---------------------------------------------------------
// DISTRIBUTOR ONBOARDING SERVICES
// ---------------------------------------------------------

export async function saveDistributorOnboarding(
  payload: DistributorOnboardingValues,
  status: "DRAFT" | "SUBMITTED",
  totalScore: number,
  recommendation: string,
  seId: string,
  existingId?: string
) {
  const dbPayload = {
    se_id: seId,
    firm_name: payload.firmName,
    owner_name: payload.ownerName,
    contact_person: payload.contactPerson,
    contact_designation: payload.contactDesignation,
    contact_mobile: payload.contactMobile,
    email: payload.email || null,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    taluka: payload.taluka,
    pincode: payload.pincode,
    gst_number: payload.gstNumber,
    pan_number: payload.panNumber,
    est_year: payload.estYear,
    firm_type: payload.firmType,
    bank_details: payload.bankAccounts,

    scoring: {
      financial: payload.scoreFinancial,
      reputation: payload.scoreReputation,
      operations: payload.scoreOperations,
      dealerNetwork: payload.scoreDealerNetwork,
      team: payload.scoreTeam,
      portfolio: payload.scorePortfolio,
      experience: payload.scoreExperience,
      growth: payload.scoreGrowth,
      remarks: {
        financial: payload.remFinancial || "",
        reputation: payload.remReputation || "",
        operations: payload.remOperations || "",
        dealerNetwork: payload.remDealerNetwork || "",
        team: payload.remTeam || "",
        portfolio: payload.remPortfolio || "",
        experience: payload.remExperience || "",
        growth: payload.remGrowth || "",
      },
      audio: {
        financial: payload.audioFinancial || "",
        reputation: payload.audioReputation || "",
        operations: payload.audioOperations || "",
        dealerNetwork: payload.audioDealerNetwork || "",
        team: payload.audioTeam || "",
        portfolio: payload.audioPortfolio || "",
        experience: payload.audioExperience || "",
        growth: payload.audioGrowth || "",
        redFlags: payload.audioRedFlags || "",
      },
      redFlags: payload.redFlags || "",
    },

    business_scope: {
      appliedTerritory: payload.appliedTerritory,
      turnoverPotential: payload.turnoverPotential,
      currentSuppliers: payload.currentSuppliers,
      demoFarmersCommitment: payload.demoFarmersCommitment,
      godownCapacity: payload.godownCapacity,
      coldChainFacility: payload.coldChainFacility
    },

    dealer_network: payload.topDealers || [],

    commitments: {
      glsCommitments: payload.glsCommitments,
      complianceChecklist: payload.complianceChecklist,
    },

    documents: payload.documents || {},
    
    // Custom handling matching the structure required for parsing mapDistributorDbToForm
    annexures: {
      territories: payload.anxTerritories,
      principalSuppliers: payload.anxPrincipalSuppliers,
      chemicalProducts: payload.anxChemicalProducts,
      bioProducts: payload.anxBioProducts,
      otherProducts: payload.anxOtherProducts,
      supplierRefs: payload.anxSupplierRefs,
      willShareSales: payload.anxWillShareSales,
      growthVision: payload.anxGrowthVision || "",
      growthVisionAudio: payload.anxGrowthVisionAudio || "",
      securityDeposit: payload.securityDeposit || "0",
      paymentProofText: payload.paymentProofText || "",
      storageLocations: payload.storageLocations || {}
    },

    total_score: totalScore,
    band: recommendation, // Table schema uses 'band'
    status: status,
    distributor_signature: payload.distributorSignature, // Table schema uses 'distributor_signature'
    se_signature: payload.seSignature,
    updated_at: new Date().toISOString()
  };

  let query = supabase.from("distributors");
  let result;

  if (existingId) {
    result = await query.update(dbPayload).eq("id", existingId).select("id").single();
  } else {
    result = await query.insert([dbPayload]).select("id").single();
  }

  if (result.error) throw result.error;
  return result.data;
}

export function mapDistributorDbToForm(db: any): DistributorOnboardingValues {
  const sourceScope = db.business_scope || {};
  const sourceAnnexures = db.annexures || {};

  return {
    firmName: db.firm_name || "",
    ownerName: db.owner_name || "",
    contactPerson: db.contact_person || "",
    contactDesignation: db.contact_designation || "",
    contactMobile: db.contact_mobile || "",
    email: db.email || "",
    address: db.address || "",
    city: db.city || "",
    state: db.state || "",
    taluka: db.taluka || "",
    pincode: db.pincode || "",
    gstNumber: db.gst_number || "",
    panNumber: db.pan_number || "",
    estYear: db.est_year || "",
    firmType: db.firm_type || "",
    bankAccounts: db.bank_details || [{ accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }],

    // Scoring & Evaluation
    scoreFinancial: db.scoring?.financial || 5,
    remFinancial: db.scoring?.remarks?.financial || "",
    audioFinancial: db.scoring?.audio?.financial || "",
    scoreReputation: db.scoring?.reputation || 5,
    remReputation: db.scoring?.remarks?.reputation || "",
    audioReputation: db.scoring?.audio?.reputation || "",
    scoreOperations: db.scoring?.operations || 5,
    remOperations: db.scoring?.remarks?.operations || "",
    audioOperations: db.scoring?.audio?.operations || "",
    scoreDealerNetwork: db.scoring?.dealerNetwork || 5,
    remDealerNetwork: db.scoring?.remarks?.dealerNetwork || "",
    audioDealerNetwork: db.scoring?.audio?.dealerNetwork || "",
    scoreTeam: db.scoring?.team || 5,
    remTeam: db.scoring?.remarks?.team || "",
    audioTeam: db.scoring?.audio?.team || "",
    scorePortfolio: db.scoring?.portfolio || 5,
    remPortfolio: db.scoring?.remarks?.portfolio || "",
    audioPortfolio: db.scoring?.audio?.portfolio || "",
    scoreExperience: db.scoring?.experience || 5,
    remExperience: db.scoring?.remarks?.experience || "",
    audioExperience: db.scoring?.audio?.experience || "",
    scoreGrowth: db.scoring?.growth || 5,
    remGrowth: db.scoring?.remarks?.growth || "",
    audioGrowth: db.scoring?.audio?.growth || "",
    redFlags: db.scoring?.redFlags || "",
    audioRedFlags: db.scoring?.audio?.redFlags || "",

    // Business Scope & Infra
    appliedTerritory: Array.isArray(sourceScope.appliedTerritory) ? sourceScope.appliedTerritory : [],
    turnoverPotential: sourceScope.turnoverPotential || "",
    currentSuppliers: Array.isArray(sourceScope.currentSuppliers) ? sourceScope.currentSuppliers : [""],
    proposedStatus: db.proposed_status || sourceScope.proposedStatus || "",
    demoFarmersCommitment: sourceScope.demoFarmersCommitment || "",
    godownCapacity: sourceScope.godownCapacity || "",
    coldChainFacility: sourceScope.coldChainFacility || "No",

    // Network
    topDealers: db.dealer_network || [],

    // Checklists
    glsCommitments: db.commitments?.glsCommitments || [],
    complianceChecklist: db.commitments?.complianceChecklist || [],

    // Storage and Documents
    documents: db.documents || {},
    storageLocations: sourceAnnexures.storageLocations || {},

    // Dynamic Annexures Arrays
    anxTerritories: Array.isArray(sourceAnnexures.territories) 
      ? sourceAnnexures.territories.map((t: any) => ({
          state: t.state || "",
          district: t.district || "",
          taluka: t.taluka || "",
          villages: Array.isArray(t.villages) ? t.villages : [],
          cultivableArea: t.cultivableArea || "",
          majorCrops: Array.isArray(t.majorCrops) ? t.majorCrops : []
        }))
      : [{ state: '', district: '', taluka: '', villages: [], cultivableArea: '', majorCrops: [] }],

    anxPrincipalSuppliers: Array.isArray(sourceAnnexures.principalSuppliers) ? sourceAnnexures.principalSuppliers : [{ name: '', share: '' }],
    anxChemicalProducts: Array.isArray(sourceAnnexures.chemicalProducts) ? sourceAnnexures.chemicalProducts : [],
    anxBioProducts: Array.isArray(sourceAnnexures.bioProducts) ? sourceAnnexures.bioProducts : [],
    anxOtherProducts: Array.isArray(sourceAnnexures.otherProducts) ? sourceAnnexures.otherProducts : [],
    anxSupplierRefs: Array.isArray(sourceAnnexures.supplierRefs) ? sourceAnnexures.supplierRefs : [{ name: '', contact: '', behavior: '' }],
    
    anxWillShareSales: typeof sourceAnnexures.willShareSales === 'boolean' ? sourceAnnexures.willShareSales : false,
    anxGrowthVision: sourceAnnexures.growthVision || "",
    anxGrowthVisionAudio: sourceAnnexures.growthVisionAudio || "",
    securityDeposit: sourceAnnexures.securityDeposit || "0",
    paymentProofText: sourceAnnexures.paymentProofText || "",

    agreementAccepted: true,
    distributorSignature: db.distributor_signature || "",
    seSignature: db.se_signature || ""
  };
}

export async function updateDistributorPdfUrl(id: string, pdfUrl: string) {
  const { error } = await supabase.from("distributors").update({ pdf_url: pdfUrl }).eq("id", id);
  if (error) throw error;
}