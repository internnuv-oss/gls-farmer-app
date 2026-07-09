import i18n from "../../../core/i18n";
import { supabase } from "../../../core/supabase";
import { translateText } from "../../../core/translationService";

export async function fetchOnboardedCount() {
  const { count } = await supabase
    .from("dealers")
    .select("*", { head: true, count: "exact" })
    .neq("status", "DRAFT");
  return count ?? 0;
}

export const fetchMyFarmers = async (userId: string, page: number = 0, limit: number = 5) => {
  const from = page * limit;
  const to = from + limit - 1;
  const { data, error } = await supabase
    .from('farmers')
    // 🚀 FIXED: Tell Supabase to join the farm_cards table so we know if they have any!
    .select('*, farm_cards(id)') 
    .eq('se_id', userId)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data || [];
};

export const fetchMyDealers = async (userId: string, page: number = 0, limit: number = 5) => { 
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('dealers') 
    .select('*')
    .eq('se_id', userId)
    .order('updated_at', { ascending: false })
    .range(from, to); 

  if (error) throw error;
  if (!data) return [];

  if (i18n.language === 'en') return data;

  const translatedData = await Promise.all(data.map(async (dealer) => {
    return {
      ...dealer,
      shop_name: await translateText(dealer.shop_name, i18n.language),
      city: await translateText(dealer.city, i18n.language),
      state: await translateText(dealer.state, i18n.language),
      firm_type: await translateText(dealer.firm_type, i18n.language),
      owner_name: await translateText(dealer.owner_name, i18n.language),
    };
  }));

  return translatedData;
};

export const fetchMyFPOs = async (userId: string, page: number = 0, limit: number = 5) => {
  const from = page * limit;
  const to = from + limit - 1;
  const { data, error } = await supabase
    .from('fpos')
    .select('*')
    .eq('se_id', userId)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data || [];
};

export const fetchMyDistributors = async (userId: string, page: number = 0, limit: number = 5) => {
  const from = page * limit;
  const to = from + limit - 1;
  const { data, error } = await supabase
    .from('distributors')
    .select('*')
    .eq('se_id', userId)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data || [];
};

// 🚀 NEW: Fetch remote drafts directly from the drafts table
export const fetchMyDrafts = async (userId: string) => {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('se_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// 🚀 NEW: Fetch routes assigned to the SE
export const fetchMyRoutes = async (userId: string) => {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('se_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export async function fetchSEProfile(seId: string) {
  const { data, error } = await supabase
    .from('sales_executive')
    .select('*')
    .eq('profile_id', seId)
    .maybeSingle(); 

  if (error) throw error;
  return data;
}

export const getNetworkData = async (search: string = '', page: number = 0, limit: number = 10) => {
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase.from('profiles').select('*', { count: 'exact' });
  
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data, count };
};

export async function deleteDealer(id: string) {
  const { error } = await supabase.from("dealers").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchNetworkSummary(seId: string) {
  // 🚀 Helper to fetch both submitted (main table) and drafts (drafts table)
  const fetchCombinedCount = async (table: string, draftEntityType: string) => {
    // 1. Count all completed/submitted rows in the main table
    const { count: mainCount } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("se_id", seId);
      
    // 2. Count all draft rows in the unified drafts table for this entity type
    const { count: draftCount } = await supabase
      .from('drafts')
      .select("*", { count: "exact", head: true })
      .eq("se_id", seId)
      .eq("entity_type", draftEntityType);

    // Return the combined sum
    return (mainCount || 0) + (draftCount || 0);
  };

  // Fetch all combined counts simultaneously
  const [dealers, farmers, distributors, fpos] = await Promise.all([
    fetchCombinedCount("dealers", "dealer"),
    fetchCombinedCount("farmers", "farmer"),
    fetchCombinedCount("distributors", "distributor"),
    fetchCombinedCount("fpos", "fpo") // Added FPOs
  ]);

  return { dealers, farmers, distributors, fpos };
}

export const deleteDraft = async (entityId: string) => {
  const { error } = await supabase.from('drafts').delete().eq('entity_id', entityId);
  if (error) throw error;
};