import { supabase } from "../../../core/supabase";
import { DealerOnboardingValues } from "../schema";

export async function saveDealerOnboarding(
  payload: DealerOnboardingValues, 
  status: "DRAFT" | "SUBMITTED",
  totalScore: number,
  recommendation: string,
  seId: string,
  existingId?: string // Optional ID for updates
) {
  const dbPayload = {
    se_id: seId,
    shop_name: payload.shopName,
    owner_name: payload.ownerName,
    contact_mobile: payload.contactMobile,
    state: payload.state,
    city: payload.city,
    taluka: payload.taluka,
    village: payload.village,
    address: payload.address,
    landmark: payload.landmark,
    gst_number: payload.gstNumber,
    pan_number: payload.panNumber,
    est_year: payload.estYear,
    firm_type: payload.firmType,
    bank_details: {
      accountName: payload.bankAccountName,
      accountNo: payload.bankAccountNumber,
      ifsc: payload.bankIfsc,
      bankName: payload.bankName,
      bankBranch: payload.bankBranch,
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
    recommendation: recommendation,
    commitments: {
      linkedDistributors: payload.linkedDistributors,
      majorCrops: payload.majorCrops,
      acresServed: payload.acresServed,
      proposedStatus: payload.proposedStatus,
      willingDemoFarmers: payload.willingDemoFarmers,
      glsCommitments: payload.glsCommitments,
      complianceChecklist: payload.complianceChecklist,
    },
    documents: payload.documents || {},
    shop_location: payload.shopLocation,
    // ---> NEW: SAVE SE ANNEXURES <---
    annexures: {
      talukasCovered: payload.seTalukasCovered,
      villagesCovered: payload.seVillagesCovered,
      totalCultivableArea: payload.seTotalCultivableArea,
      totalCultivableAreaUnit: payload.seTotalCultivableAreaUnit,
      majorCrops: payload.seMajorCrops,
      principalSuppliers: payload.sePrincipalSuppliers,
      chemicalProducts: payload.seChemicalProducts,
      bioProducts: payload.seBioProducts,
      otherProducts: payload.seOtherProducts,
      godownCapacity: payload.seGodownCapacity,
      godownCapacityUnit: payload.seGodownCapacityUnit,
      hasCreditReferences: payload.seHasCreditReferences,
      creditReferences: payload.seCreditReferences,
      willShareSales: payload.seWillShareSales,
      growthVision: payload.seGrowthVision,
      growthVisionAudio: payload.seGrowthVisionAudio,
      securityDeposit: payload.seSecurityDeposit,
    },
    // --------------------------------
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
  // Extract distributors array before returning the object
  const distributors = db.commitments?.linkedDistributors || [];

  return {
    shopName: db.shop_name,
    ownerName: db.owner_name,
    contactMobile: db.contact_mobile,
    state: db.state || "",
    city: db.city || "",
    taluka: db.taluka || "",
    village: db.village || "",
    address: db.address,
    landmark: db.landmark || "",
    gstNumber: db.gst_number || "",
    panNumber: db.pan_number || "",
    estYear: db.est_year || "",
    firmType: db.firm_type || "",
    
    bankAccountName: db.bank_details?.accountName || "",
    bankAccountNumber: db.bank_details?.accountNo || "",
    bankIfsc: db.bank_details?.ifsc || "",
    bankName: db.bank_details?.bankName || "",
    bankBranch: db.bank_details?.bankBranch || "",

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
    audioFinancial: db.scoring?.audio?.financial || "",
    audioReputation: db.scoring?.audio?.reputation || "",
    audioOperations: db.scoring?.audio?.operations || "",
    audioFarmerNetwork: db.scoring?.audio?.farmerNetwork || "",
    audioTeam: db.scoring?.audio?.team || "",
    audioPortfolio: db.scoring?.audio?.portfolio || "",
    audioExperience: db.scoring?.audio?.experience || "",
    audioGrowth: db.scoring?.audio?.growth || "",
    audioRedFlags: db.scoring?.audio?.redFlags || "",

    // ---> NEW UPDATED SECTION <---
    isLinkedToDistributor: distributors.length > 0 ? "Yes" : "No",
    linkedDistributors: distributors.length > 0 ? distributors : [{ name: '', contact: '' }],
    // -----------------------------

    majorCrops: db.commitments?.majorCrops || [],
    acresServed: db.commitments?.acresServed || "",
    proposedStatus: db.commitments?.proposedStatus || "",
    willingDemoFarmers: db.commitments?.willingDemoFarmers || "",

    glsCommitments: db.commitments?.glsCommitments || [],
    complianceChecklist: db.commitments?.complianceChecklist || [],

    documents: db.documents || {},
    shopLocation: db.shop_location,

    // ---> NEW: MAP SE ANNEXURES <---
    seTalukasCovered: db.annexures?.talukasCovered || [],
    seVillagesCovered: db.annexures?.villagesCovered || [],
    seTotalCultivableArea: db.annexures?.totalCultivableArea || "",
    seTotalCultivableAreaUnit: db.annexures?.totalCultivableAreaUnit || "Acres",
    seMajorCrops: db.annexures?.majorCrops || [],
    sePrincipalSuppliers: db.annexures?.principalSuppliers || [],
    seChemicalProducts: db.annexures?.chemicalProducts || [],
    seBioProducts: db.annexures?.bioProducts || [],
    seOtherProducts: db.annexures?.otherProducts || [],
    seGodownCapacity: db.annexures?.godownCapacity || "",
    seGodownCapacityUnit: db.annexures?.godownCapacityUnit || "Sq.ft",
    seHasCreditReferences: db.annexures?.hasCreditReferences || "No",
    seCreditReferences: db.annexures?.creditReferences || [{ name: '', contact: '', behavior: '', behaviorAudio: '' }],
    seWillShareSales: db.annexures?.willShareSales || false,
    seGrowthVision: db.annexures?.growthVision || "",
    seGrowthVisionAudio: db.annexures?.growthVisionAudio || "",
    seSecurityDeposit: db.annexures?.securityDeposit || "",
    // --------------------------------

    agreementAccepted: true, // Already submitted
    dealerSignature: db.dealer_signature || "",
    seSignature: db.se_signature || "",
  };
}

// Add this new function at the bottom of the file
export async function updateDealerPdfUrl(id: string, pdfUrl: string) {
  const { error } = await supabase.from("dealers").update({ pdf_url: pdfUrl }).eq("id", id);
  if (error) throw error;
}