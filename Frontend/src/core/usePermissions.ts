import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

type Permission = {
  module_name: string;
  can_view: boolean | null;
  can_edit: boolean | null;
};

export const usePermissions = (userId: string | undefined) => {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Wrap the fetch logic in useCallback so we can call it manually
  const fetchPerms = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile?.role === 'TH' || profile?.role === 'Super Admin') {
        setIsSuperAdmin(true);
        setLoading(false);
        return; 
      }

      if (profile?.role) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .eq('name', profile.role)
          .single();

        if (roleData?.id) {
          const { data } = await supabase
            .from('role_permissions')
            .select('module_name, can_view, can_edit')
            .eq('role_id', roleData.id);
          
          if (data && data.length > 0) {
            setPerms(data);
            setLoading(false);
            return; 
          }
        }
      } 
      
      if (profile?.role === 'SE') {
        setPerms([
          { module_name: 'mobile_travel_activity', can_view: true, can_edit: true },
          { module_name: 'mobile_farmer', can_view: true, can_edit: true },
          { module_name: 'mobile_dealer', can_view: true, can_edit: true },
          { module_name: 'mobile_distributor', can_view: true, can_edit: true },
          { module_name: 'mobile_fpo', can_view: true, can_edit: true },
          { module_name: 'mobile_retail', can_view: true, can_edit: true }
        ]);
      }
    } catch (e) {
      console.error("Error fetching permissions", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    fetchPerms();
  }, [fetchPerms]);

  const getModulePerm = useCallback((moduleName: string) => {
    if (isSuperAdmin) return { can_view: true, can_edit: true };
    const p = perms.find(p => p.module_name === moduleName);
    return { can_view: !!p?.can_view, can_edit: !!p?.can_edit };
  }, [isSuperAdmin, perms]);

  // EXPORT THE REFRESH FUNCTION
  return { permissions: perms, loading, getModulePerm, refreshPermissions: fetchPerms };
};