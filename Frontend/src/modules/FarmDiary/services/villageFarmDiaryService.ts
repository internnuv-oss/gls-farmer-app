import { supabase } from '../../../core/supabase';

export type DiaryStageRow = {
  diaryId: string;
  farmCardId: string | null;
  farmName: string;
  currentStage: string;
  nextStage: string;
  cropName: string | null;
};

export type VillageFarmDiaryFarmer = {
  farmer: any;
  diaries: DiaryStageRow[];
};

const NOT_STARTED = 'Not started';
const COMPLETE = 'Complete';
const NO_DIARY = 'No diary yet';

function hasFarmCard(farmer: any): boolean {
  return (
    farmer?.raw?.has_farm_card === true ||
    (Array.isArray(farmer?.raw?.farm_cards) && farmer.raw.farm_cards.length > 0)
  );
}

async function resolveNextStage(
  cropId: string | null,
  currentStageId: string | null,
  sopCache: Map<string, { stageId: string; stageName: string; sequence: number }[]>
): Promise<string> {
  if (!cropId) return '—';

  let stages = sopCache.get(cropId);
  if (!stages) {
    const { data } = await supabase
      .from('sop_crop_stages')
      .select('stage_id, stage_sequence, master_crop_stages ( id, stage_name )')
      .eq('crop_id', cropId)
      .order('stage_sequence', { ascending: true });

    stages = (data || []).map((row: any) => ({
      stageId: row.stage_id || row.master_crop_stages?.id,
      stageName: row.master_crop_stages?.stage_name || `Stage ${row.stage_sequence}`,
      sequence: Number(row.stage_sequence) || 0,
    }));
    sopCache.set(cropId, stages);
  }

  if (!stages.length) return '—';

  if (!currentStageId) {
    return stages[0].stageName;
  }

  const idx = stages.findIndex((s) => s.stageId === currentStageId);
  if (idx < 0) return stages[0].stageName;
  if (idx >= stages.length - 1) return COMPLETE;
  return stages[idx + 1].stageName;
}

async function resolveCropIdByName(
  farmName: string,
  cropCache: Map<string, string | null>
): Promise<string | null> {
  const key = farmName.trim().toLowerCase();
  if (!key) return null;
  if (cropCache.has(key)) return cropCache.get(key) || null;

  const { data } = await supabase
    .from('master_crops')
    .select('id, crop_name')
    .ilike('crop_name', farmName.trim())
    .limit(1)
    .maybeSingle();

  const id = data?.id || null;
  cropCache.set(key, id);
  return id;
}

/**
 * Enrich village farmers that have a Farm Card with diary current/next stage rows.
 * Pass already village-filtered farmer entities from Dashboard.
 */
export async function enrichVillageFarmDiaryFarmers(
  farmers: any[]
): Promise<VillageFarmDiaryFarmer[]> {
  const withCards = farmers.filter(hasFarmCard);
  if (withCards.length === 0) return [];

  const farmerIds = withCards
    .map((f) => f.id || f.entityId || f.raw?.id)
    .filter(Boolean);

  const { data: diaries, error: diaryError } = await supabase
    .from('farm_diary')
    .select('id, farmer_id, farm_card_id, farm_name, created_at')
    .in('farmer_id', farmerIds)
    .order('created_at', { ascending: false });

  if (diaryError) {
    console.error('Failed to fetch village farm diaries', diaryError);
    return withCards.map((farmer) => ({ farmer, diaries: [] }));
  }

  const diaryList = diaries || [];
  const diaryIds = diaryList.map((d) => d.id);

  const latestByDiary = new Map<string, any>();
  if (diaryIds.length > 0) {
    const { data: sessions, error: sessionError } = await supabase
      .from('crop_observation_sessions')
      .select(`
        id,
        farm_diary_id,
        selected_crop_id,
        selected_stage_id,
        created_at,
        master_crops ( id, crop_name ),
        master_crop_stages ( id, stage_name )
      `)
      .in('farm_diary_id', diaryIds)
      .order('created_at', { ascending: false });

    if (sessionError) {
      console.error('Failed to fetch crop observation sessions', sessionError);
    } else {
      for (const session of sessions || []) {
        if (!latestByDiary.has(session.farm_diary_id)) {
          latestByDiary.set(session.farm_diary_id, session);
        }
      }
    }
  }

  const sopCache = new Map<string, { stageId: string; stageName: string; sequence: number }[]>();
  const cropCache = new Map<string, string | null>();

  const diariesByFarmer = new Map<string, DiaryStageRow[]>();

  for (const diary of diaryList) {
    const session = latestByDiary.get(diary.id);
    const farmName = diary.farm_name || 'Unnamed Farm Diary';
    let cropId: string | null =
      session?.selected_crop_id || session?.master_crops?.id || null;
    const cropName: string | null =
      session?.master_crops?.crop_name || farmName || null;

    if (!cropId && farmName) {
      cropId = await resolveCropIdByName(farmName, cropCache);
    }

    const currentStageId: string | null =
      session?.selected_stage_id || session?.master_crop_stages?.id || null;
    const currentStage = session?.master_crop_stages?.stage_name || NOT_STARTED;
    const nextStage = await resolveNextStage(cropId, currentStageId, sopCache);

    const row: DiaryStageRow = {
      diaryId: diary.id,
      farmCardId: diary.farm_card_id,
      farmName,
      currentStage,
      nextStage: currentStage === NOT_STARTED && nextStage === COMPLETE ? '—' : nextStage,
      cropName,
    };

    const list = diariesByFarmer.get(diary.farmer_id) || [];
    list.push(row);
    diariesByFarmer.set(diary.farmer_id, list);
  }

  return withCards.map((farmer) => {
    const fid = farmer.id || farmer.entityId || farmer.raw?.id;
    const diariesForFarmer = diariesByFarmer.get(fid) || [];

    if (diariesForFarmer.length === 0) {
      return {
        farmer,
        diaries: [
          {
            diaryId: `none-${fid}`,
            farmCardId: null,
            farmName: NO_DIARY,
            currentStage: NOT_STARTED,
            nextStage: '—',
            cropName: null,
          },
        ],
      };
    }

    return { farmer, diaries: diariesForFarmer };
  });
}
