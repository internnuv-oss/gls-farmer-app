import { supabase } from '../../../core/supabase';
import { FarmCardValues } from '../schema';

export async function saveFarmCard(
  payload: FarmCardValues, 
  seId: string, 
  status: 'DRAFT' | 'SUBMITTED',
  cardId?: string // 🚀 NEW: Optional ID to update existing drafts
) {
  const dbPayload = {
    farmer_id: payload.farmerId,
    se_id: seId,
    status: status,
    card_data: payload,
    boundary_polygon: payload.boundary_polygon || [],
    media_urls: payload.documents,
    media_gps: payload.media_gps,
    updated_at: new Date().toISOString()
  };

  let request;
  if (cardId) {
    // If a cardId exists, UPDATE the existing draft
    request = supabase.from('farm_cards').update(dbPayload).eq('id', cardId).select().single();
  } else {
    // Otherwise, INSERT a new record
    request = supabase.from('farm_cards').insert([dbPayload]).select().single();
  }

  const { data, error } = await request;
  if (error) throw error;

  if (status === 'SUBMITTED') {
    await supabase.from('farmers').update({ has_farm_card: true }).eq('id', payload.farmerId);
  }

  return data;
}