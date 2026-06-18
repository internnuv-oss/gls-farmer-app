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
    .select('*')
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

// Add this anywhere in the file
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
  const fetchCount = async (table: string, statusCheck: boolean = false) => {
    let query = supabase.from(table).select("*", { count: "exact", head: true }).eq("se_id", seId);
    if (statusCheck) query = query.eq("status", "SUBMITTED");
    
    const { count, error } = await query;
    if (error) return 0; 
    return count || 0;
  };

  // 🚀 FIX: Fetch fpos count as well
  const [dealers, farmers, distributors, fpos] = await Promise.all([
    fetchCount("dealers", true),
    fetchCount("farmers"),
    fetchCount("distributors"),
    fetchCount("fpos")
  ]);

  return { dealers, farmers, distributors, fpos };
}

export const deleteDraft = async (entityId: string) => {
  const { error } = await supabase.from('drafts').delete().eq('entity_id', entityId);
  if (error) throw error;
};