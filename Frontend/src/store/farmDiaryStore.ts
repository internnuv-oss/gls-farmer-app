import { create } from 'zustand';
import { supabase } from '../core/supabase';
import { useAuthStore } from './authStore';
import { useAlertStore } from './alertStore';
import { uploadFileToCloudinary } from '../modules/onboarding/services/cloudinaryService';

export interface FarmDiary {
  id: string;
  farmer_id: string;
  farm_card_id: string;
  farm_name: string;
  survey_khasra_no: string;
  total_land_area_acres: number;
  cultivated_area_acres: number;
  diary_polygon: any;
  created_at: string;
  // Other fields...
}

export interface FarmDiaryState {
  diaries: FarmDiary[];
  isLoading: boolean;
  
  fetchDiaries: (farmerId: string) => Promise<void>;
  createDiary: (diaryData: any) => Promise<string | null>;
  updateDiary: (diaryId: string, diaryData: any) => Promise<boolean>;
  startBaseVisit: (diaryId: string, visitData: any) => Promise<string | null>;
  fetchDynamicParameters: (cropId: string, stageId: string) => Promise<any>;
  saveCropObservation: (sessionData: any, samples: any[]) => Promise<boolean>;
  fetchHistoryLedger: (diaryId: string) => Promise<any[]>;
  getNextVisitNumber: (diaryId: string) => Promise<number>;
}

export const useFarmDiaryStore = create<FarmDiaryState>((set, get) => ({
  diaries: [],
  isLoading: false,

  fetchDiaries: async (farmerId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('farm_diary')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ diaries: data || [] });
    } catch (error: any) {
      console.error('Fetch Diaries Error:', error);
      useAlertStore.getState().showAlert('Error', 'Failed to fetch farm diaries.');
    } finally {
      set({ isLoading: false });
    }
  },

  createDiary: async (diaryData) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('farm_diary')
        .insert([diaryData])
        .select('id')
        .single();

      if (error) throw error;
      
      // Refresh list
      if (diaryData.farmer_id) {
        get().fetchDiaries(diaryData.farmer_id);
      }
      return data.id;
    } catch (error: any) {
      console.error('Create Diary Error:', error);
      useAlertStore.getState().showAlert('Error', 'Failed to create farm diary.');
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateDiary: async (diaryId, diaryData) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('farm_diary')
        .update(diaryData)
        .eq('id', diaryId);

      if (error) throw error;
      
      // Refresh list
      if (diaryData.farmer_id) {
        get().fetchDiaries(diaryData.farmer_id);
      }
      
      return true;
    } catch (error: any) {
      console.error('Update Diary Error:', error);
      useAlertStore.getState().showAlert('Error', 'Failed to update farm diary.');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  startBaseVisit: async (diaryId, visitData) => {
    set({ isLoading: true });
    try {
      const fieldExecutiveId = useAuthStore.getState().user?.id;
      if (!fieldExecutiveId) throw new Error('Unauthorized');

      // Get max visit number
      const { data: maxVisitData, error: maxVisitError } = await supabase
        .from('mandatory_base_visits')
        .select('visit_number')
        .eq('farm_diary_id', diaryId)
        .order('visit_number', { ascending: false })
        .limit(1);

      if (maxVisitError) throw maxVisitError;

      const nextVisitNumber = maxVisitData && maxVisitData.length > 0 ? maxVisitData[0].visit_number + 1 : 1;

      let uploadedPhotos: string[] = [];
      if (visitData.visit_photos && visitData.visit_photos.length > 0) {
        // Run all uploads in parallel, similar to FarmCardOnboarding
        const uploadPromises = visitData.visit_photos.map(async (uri: string) => {
          try {
            if (uri && uri.startsWith('file://')) {
              const cloudUrl = await uploadFileToCloudinary(uri, 'image');
              return cloudUrl;
            }
            return uri; // Already a cloud URL or empty
          } catch (err) {
            console.error('Failed to upload photo:', err);
            return uri; // fallback to local URI if upload fails
          }
        });

        uploadedPhotos = await Promise.all(uploadPromises);
      }

      const payload = {
        ...visitData,
        visit_photos: uploadedPhotos,
        farm_diary_id: diaryId,
        field_executive_id: fieldExecutiveId,
        visit_number: nextVisitNumber,
        is_completed: true, // Assuming submitting this marks it as complete
      };

      const { data, error } = await supabase
        .from('mandatory_base_visits')
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;
      useAlertStore.getState().showAlert('Success', 'Base visit started successfully.');
      return data.id;
    } catch (error: any) {
      console.error('Start Base Visit Error:', error);
      useAlertStore.getState().showAlert('Error', 'Failed to start base visit.');
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDynamicParameters: async (cropId, stageId) => {
    try {
      // 1. Get sop_crop_stage_id
      const { data: stageData, error: stageError } = await supabase
        .from('sop_crop_stages')
        .select('id')
        .eq('crop_id', cropId)
        .eq('stage_id', stageId)
        .single();

      if (stageError || !stageData) {
        console.warn('No SOP defined for this crop and stage');
        return [];
      }

      // 2. Fetch parameters for this sop_crop_stage
      const { data: sopParams, error: paramsError } = await supabase
        .from('sop_parameters')
        .select(`
          id,
          is_mandatory,
          master_parameters (
            id,
            parameter_label,
            ui_input_type,
            options_data,
            validation_rules
          )
        `)
        .eq('sop_crop_stage_id', stageData.id);

      if (paramsError) throw paramsError;

      // 3. For each parameter, fetch permitted UOMs
      const enrichedParams = await Promise.all(
        (sopParams || []).map(async (sp: any) => {
          const paramId = sp.master_parameters.id;
          const { data: uomData, error: uomError } = await supabase
            .from('parameter_uom_mapping')
            .select(`
              is_default_uom,
              master_uom (
                id,
                uom_name,
                uom_symbol
              )
            `)
            .eq('parameter_id', paramId);
          
          return {
            ...sp.master_parameters,
            is_mandatory: sp.is_mandatory,
            permitted_uoms: (uomData || []).map((u: any) => ({
              uom_id: u.master_uom.id,
              symbol: u.master_uom.uom_symbol,
              is_default: u.is_default_uom,
            }))
          };
        })
      );

      return enrichedParams;
    } catch (error: any) {
      console.error('Fetch Dynamic Params Error:', error);
      return [];
    }
  },

  saveCropObservation: async (sessionData, samples) => {
    set({ isLoading: true });
    try {
      // 1. Insert Session
      const { data: session, error: sessionError } = await supabase
        .from('crop_observation_sessions')
        .insert([sessionData])
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      // 2. Insert Plant Sample Sets
      const sessionId = session.id;
      for (const sample of samples) {
        const { data: sampleSet, error: sampleSetError } = await supabase
          .from('plant_sample_sets')
          .insert([{
            session_id: sessionId,
            sample_set_index: sample.index,
            sample_photo_file_path: sample.photo_path
          }])
          .select('id')
          .single();

        if (sampleSetError) throw sampleSetError;

        // 3. Insert Parameter Values for this sample
        const valuesToInsert = sample.values.map((v: any) => ({
          sample_set_id: sampleSet.id,
          parameter_id: v.parameter_id,
          selected_uom_id: v.uom_id || null,
          logged_value_raw: v.value,
        }));

        if (valuesToInsert.length > 0) {
          const { error: valuesError } = await supabase
            .from('sample_parameter_values')
            .insert(valuesToInsert);

          if (valuesError) throw valuesError;
        }
      }

      useAlertStore.getState().showAlert('Success', 'Crop observation saved successfully.');
      return true;
    } catch (error: any) {
      console.error('Save Crop Obs Error:', error);
      useAlertStore.getState().showAlert('Error', 'Failed to save crop observation.');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchHistoryLedger: async (diaryId) => {
    try {
      // 1. Fetch mandatory base visits
      const { data: baseVisits, error: baseError } = await supabase
        .from('mandatory_base_visits')
        .select('*')
        .eq('farm_diary_id', diaryId);

      if (baseError) throw baseError;

      // 2. Fetch crop observation sessions
      const { data: cropObs, error: obsError } = await supabase
        .from('crop_observation_sessions')
        .select(`
          id,
          base_visit_id,
          created_at,
          overall_plant_health_score,
          master_crops ( crop_name ),
          master_crop_stages ( stage_name ),
          plant_sample_sets (
            id,
            sample_set_index,
            sample_photo_file_path,
            sample_parameter_values (
              logged_value_raw,
              master_parameters ( parameter_label ),
              master_uom ( uom_symbol )
            )
          )
        `)
        .eq('farm_diary_id', diaryId);

      if (obsError) throw obsError;

      // 3. Combine them
      const baseVisitsList = baseVisits || [];
      const cropObsList = cropObs || [];

      const combined = baseVisitsList.map((bv: any) => {
        const obs = cropObsList.find((co: any) => co.base_visit_id === bv.id);
        if (obs) {
          return { ...obs, is_general: false, base_visit: bv };
        } else {
          return {
            id: bv.id,
            created_at: bv.created_at,
            is_general: true,
            base_visit: bv,
            overall_plant_health_score: null,
            master_crops: null,
            master_crop_stages: null,
            plant_sample_sets: []
          };
        }
      });

      // Also include any crop observations that don't have a base visit (just in case)
      cropObsList.forEach((co: any) => {
        if (!co.base_visit_id || !baseVisitsList.some((bv: any) => bv.id === co.base_visit_id)) {
          combined.push({ ...co, is_general: false, base_visit: null });
        }
      });

      // Sort by created_at desc
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combined;
    } catch (error: any) {
      console.error('Fetch History Ledger Error:', error);
      return [];
    }
  },

  getNextVisitNumber: async (diaryId: string) => {
    try {
      const { data, error } = await supabase
        .from('mandatory_base_visits')
        .select('visit_number')
        .eq('farm_diary_id', diaryId)
        .order('visit_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0].visit_number + 1 : 1;
    } catch (error: any) {
      console.error('Get Next Visit Number Error:', error);
      return 1;
    }
  }
}));
