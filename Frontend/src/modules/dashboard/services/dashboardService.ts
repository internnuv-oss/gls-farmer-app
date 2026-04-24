import { supabase } from "../../../core/supabase";

export async function fetchOnboardedCount() {
  const { count } = await supabase
    .from("dealers")
    .select("*", { head: true, count: "exact" })
    .neq("status", "DRAFT");
  return count ?? 0;
}

export const fetchMyDealers = async (userId: string, page: number = 0, limit: number = 10) => {
  const from = page * limit;
  const to = from + limit - 1;

  // ✅ Updated table to 'dealers' and join column to 'se_id'
  const { data, error } = await supabase
    .from('dealers') 
    .select('*')
    .eq('se_id', userId) // Matches your se_id uuid foreign key
    .order('created_at', { ascending: false })
    .range(from, to); 

  if (error) {
    console.error("Supabase Fetch Error:", error.message);
    throw error;
  }
  
  return data || [];
};

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