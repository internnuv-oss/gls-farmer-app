import { supabase } from "../../../core/supabase";
import { DealerOnboardingValues } from "../dealer/schema";

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