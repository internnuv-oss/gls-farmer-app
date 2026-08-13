// Frontend/src/core/usePermissions.ts

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

type Permission = {
  module_name: string;
  can_view: boolean | null;
  can_edit: boolean | null;
};

const CACHE_KEY = '@user_permissions_cache';

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

    try {
      // 🚀 1. OFFLINE-FIRST: Instantly load cached permissions to unblock the UI
      const cachedData = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setPerms(parsed.perms || []);
        setIsSuperAdmin(parsed.isSuperAdmin || false);
        setLoading(false); // UI instantly moves past the loading screen here!
      } else {
        setLoading(true); // Only show spinner if it's their very first time logging in
      }

      // 🚀 2. BACKGROUND SYNC: Fetch fresh data from Supabase silently
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      let freshPerms: Permission[] = [];
      let freshSuperAdmin = false;

      if (profile?.role === 'TH' || profile?.role === 'Super Admin') {
        freshSuperAdmin = true;
      } else if (profile?.role === 'SE') {
        freshPerms = [
          { module_name: 'mobile_travel_activity', can_view: true, can_edit: true },
          { module_name: 'mobile_farmer', can_view: true, can_edit: true },
          { module_name: 'mobile_dealer', can_view: true, can_edit: true },
          { module_name: 'mobile_distributor', can_view: true, can_edit: true },
          { module_name: 'mobile_fpo', can_view: true, can_edit: true },
          { module_name: 'mobile_retail', can_view: true, can_edit: true }
        ];
      } else if (profile?.role) {
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
            freshPerms = data;
          }
        }
      }

      // 🚀 3. CACHE UPDATE: Save fresh data for next time
      setPerms(freshPerms);
      setIsSuperAdmin(freshSuperAdmin);
      await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
        perms: freshPerms,
        isSuperAdmin: freshSuperAdmin
      }));

    } catch (e) {
      console.error("Error fetching permissions", e);
    } finally {
      setLoading(false); // Guarantee UI unblocks even if background sync fails
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