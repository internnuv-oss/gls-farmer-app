import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useAlertStore } from '../../store/alertStore';
import { useShiftStore } from '../../store/shiftStore';
import { supabase } from '../../core/supabase';

export type FSPPFormData = {
  committedLand: string;
  committedLandUnit: string;
  seasonalExpense: string; 
  bioAwareness: string; 
  glsKnowledge: string; 
  mindsetA: string; 
  mindsetB: string; 
  mindsetC: string; 
  mindsetD: string; 
};

export const useFSPPEnrollment = (navigation: any, route: any) => {
  const { entity } = route.params;
  const raw = entity?.raw || {};

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // If the form was saved as a draft previously, we ignore it to start fresh
  const isCompleted = raw?.fspp_details?.statusLabel && raw?.fspp_details?.statusLabel !== 'DRAFT';
  const fsppDraft = isCompleted ? raw.fspp_details : {};

  const form = useForm<FSPPFormData>({
    defaultValues: {
      committedLand: fsppDraft.committedLand || '',
      committedLandUnit: fsppDraft.committedLandUnit || 'Acres',
      seasonalExpense: fsppDraft.seasonalExpense || '',
      bioAwareness: fsppDraft.bioAwareness || '',
      glsKnowledge: fsppDraft.glsKnowledge || '',
      mindsetA: fsppDraft.mindsetA || '',
      mindsetB: fsppDraft.mindsetB || '',
      mindsetC: fsppDraft.mindsetC || '',
      mindsetD: fsppDraft.mindsetD || '',
    },
    mode: 'onChange',
  });

  const { watch, formState: { isValid } } = form;

  const totalLandStr = raw?.farm_details?.totalLand || '0';
  const totalLandUnit = raw?.farm_details?.landUnit || 'Acres';
  let totalLand = parseFloat(totalLandStr);
  if (totalLandUnit === 'Bigha') {
    totalLand = totalLand / 2.5;
  }

  const committedLandVal = parseFloat(watch('committedLand') || '0');
  let committedLandAcres = committedLandVal;
  if (watch('committedLandUnit') === 'Bigha') {
    committedLandAcres = committedLandVal / 2.5;
  }
  
  const isNextEnabled = true;

  const isSubmitEnabled = useMemo(() => {
    return (
      watch('committedLand') !== '' &&
      watch('seasonalExpense') !== '' &&
      watch('bioAwareness') !== '' &&
      watch('glsKnowledge') !== '' &&
      watch('mindsetA') !== '' &&
      watch('mindsetB') !== '' &&
      watch('mindsetC') !== '' &&
      watch('mindsetD') !== ''
    );
  }, [watch('committedLand'), watch('seasonalExpense'), watch('bioAwareness'), watch('glsKnowledge'), watch('mindsetA'), watch('mindsetB'), watch('mindsetC'), watch('mindsetD')]);

  const calculateScore = () => {
    // 1. Mandatory Knockout
    if (totalLand < 1.0 || committedLandAcres < 1.0) {
      return { score: 0, status: 'Disqualified / Hold', category: 'Category C', isKnockout: true };
    }

    // 2. Points mapping
    let points = 0;
    
    // Total Land logic (Max 10)
    if (totalLand >= 4) points += 10;
    else if (totalLand >= 2) points += 5;
    
    // Committed Land logic (Max 15)
    if (committedLandAcres >= 1) points += 15;

    // Seasonal Expense (Max 30)
    points += parseInt(watch('seasonalExpense') || '0', 10);

    // Awareness & Knowledge (Max 25)
    points += parseInt(watch('bioAwareness') || '0', 10);
    points += parseInt(watch('glsKnowledge') || '0', 10);

    // Mindset (Max 20)
    points += parseInt(watch('mindsetA') || '0', 10);
    points += parseInt(watch('mindsetB') || '0', 10);
    points += parseInt(watch('mindsetC') || '0', 10);
    points += parseInt(watch('mindsetD') || '0', 10);

    // Status Assignment
    if (points >= 70) return { score: points, status: 'Category A (Highly Qualified) - Anchor/Demo Plot', category: 'Category A', isKnockout: false };
    if (points >= 50) return { score: points, status: 'Category B (Qualified)', category: 'Category B', isKnockout: false };
    return { score: points, status: 'Disqualified / Hold', category: 'Category C', isKnockout: false };
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const result = calculateScore();
      
      const fspp_details = {
        totalLand,
        ...form.getValues(),
        evaluationDate: new Date().toISOString(),
        score: result.score,
        category: result.category,
        statusLabel: result.status,
        isKnockout: result.isKnockout
      };

      const { error } = await supabase
        .from('farmers')
        .update({ fspp_details })
        .eq('id', raw.id);

      if (error) throw error;

      // 🚀 NEW: Log FSPP Activity for Travel Report Timeline
      await useShiftStore.getState().incrementActivity();
      
      let routeName = "Others";
      const shiftId = useShiftStore.getState().activeShiftId;
      if (shiftId) {
        const { data: sData } = await supabase.from('shifts').select('assigned_route_id').eq('id', shiftId).single();
        if (sData?.assigned_route_id) {
          const { data: rData } = await supabase.from('routes').select('name').eq('id', sData.assigned_route_id).single();
          if (rData?.name) routeName = rData.name;
        }
      }
      
      // Extract Farmer Name and Village robustly from the raw entity data
      const farmerName = raw.fullName || raw.full_name || "Unknown Farmer";
      const villageName = raw.personal_details?.village || raw.village || "Unknown Village";
      
      // Format: Farmer Name \n Score: X (Category) \n Route (Village)
      const eventDesc = `${farmerName}\nScore: ${result.score} (${result.category})\n${routeName} (${villageName})`;
      
      await useShiftStore.getState().logShiftEvent('activity', 'Completed FSPP Assessment', eventDesc);

      setShowSuccess(true);
    } catch (err: any) {
      useAlertStore.getState().showAlert('Submission Failed', err.message || 'Could not enroll farmer into FSPP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    step,
    setStep,
    isNextEnabled,
    isSubmitEnabled,
    isSubmitting,
    submit,
    showSuccess,
    setShowSuccess,
    calculateScore,
    totalLand,
    isCompleted
  };
};
