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
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!data) return [];
  return data;
};

export const fetchMyDealers = async (userId: string, page: number = 0, limit: number = 5) => { // Updated limit to 5
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('dealers') 
    .select('*')
    .eq('se_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to); 

  if (error) throw error;
  if (!data) return [];

  // If language is English, just return the data immediately
  if (i18n.language === 'en') return data;

  // 🚀 Translate dynamic fields on the fly using Promise.all to do it in parallel
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

export async function fetchSEProfile(seId: string) {
  const { data, error } = await supabase
    .from('sales_executive')
    .select('*')
    .eq('profile_id', seId)
    // 🚀 CHANGED: from .single() to .maybeSingle()
    .maybeSingle(); 

  if (error) throw error;
  return data;
}
// ✅ Add page and limit parameters
export const getNetworkData = async (search: string = '', page: number = 0, limit: number = 10) => {
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase.from('profiles').select('*', { count: 'exact' });
  
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  // ✅ Fetch only the chunk of data we need
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

// NEW: Fetch network counts for the profile screen
export async function fetchNetworkSummary(seId: string) {
  // Helper to fetch count without downloading data
  const fetchCount = async (table: string, statusCheck: boolean = false) => {
    let query = supabase.from(table).select("*", { count: "exact", head: true }).eq("se_id", seId);
    if (statusCheck) query = query.eq("status", "SUBMITTED");
    
    const { count, error } = await query;
    // If the table doesn't exist yet, or there's an RLS error, it returns 0 gracefully
    if (error) return 0; 
    return count || 0;
  };

  // Run all 3 queries in parallel for fast loading
  const [dealers, farmers, distributors] = await Promise.all([
    fetchCount("dealers", true),
    fetchCount("farmers"),
    fetchCount("distributors")
  ]);

  return { dealers, farmers, distributors };
}