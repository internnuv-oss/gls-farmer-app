import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, TextInput, ActivityIndicator, Linking, AppState } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker'; // 🚀 Import ImagePicker for real camera launch
import { colors, radius, spacing } from '../../../design-system/tokens';
import { SelectField } from '../../../design-system/components';
import { Button } from '../../../design-system/components';
import { requestCameraPermission } from '../../../core/permissions'; // 🚀 Use global permission system
import { useAlertStore } from '../../../store/alertStore'; // 🚀 Use global alert system
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../core/supabase';
import { useAuthStore } from '../../../store/authStore';

export const PunchInModal = ({ visible, onClose, onConfirm }: any) => {
  const { t } = useTranslation();

  const [vehicleType, setVehicleType] = useState<'two-wheeler' | 'four-wheeler'>('two-wheeler'); // 🚀 REQ 1
  const [customTime, setCustomTime] = useState(new Date()); // 🚀 REQ 3
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isTimeEdited, setIsTimeEdited] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  
  const [step, setStep] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStr, setLocationStr] = useState(t("Locating..."));
  const [exactLocation, setExactLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [isPersonal, setIsPersonal] = useState<boolean | null>(null);
  const [startKm, setStartKm] = useState('');
  const [transitMode, setTransitMode] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // 🚀 Fetch Assigned Routes on Mount
  useEffect(() => {
    const fetchRoutes = async () => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('se_id', userId); // Assuming routes are assigned via se_id

      if (data && !error) setRoutes(data);
    };
    fetchRoutes();
  }, []);

  const formatRouteLabel = (route: any) => {
    return route.name;
  };

  // Odometer Camera states
  const [odoImage, setOdoImage] = useState<string | undefined>(undefined);
  const [isLaunchingCamera, setIsLaunchingCamera] = useState(false);

  // 🚀 Core function separated so it can be called dynamically on App Focus / Resume
  // 🚀 THE FIX: Prevent overlapping fetch cycles
  const isFetchingLoc = useRef(false);

  const checkLocationAndPermissions = async () => {
    if (isFetchingLoc.current) return;
    isFetchingLoc.current = true;

    try {
      setLocationStr(t("Fetching location..."));
      
      // 1. Check Foreground First (DO NOT request unless necessary)
      let fgPerm = await Location.getForegroundPermissionsAsync();
      if (fgPerm.status !== 'granted') {
        fgPerm = await Location.requestForegroundPermissionsAsync();
      }
      
      if (fgPerm.status !== 'granted') {
        setLocationStr(t("Location permission denied"));
        return;
      }

      // 2. Check Background Second (DO NOT request unless necessary)
      let bgPerm = await Location.getBackgroundPermissionsAsync();
      if (bgPerm.status !== 'granted') {
        bgPerm = await Location.requestBackgroundPermissionsAsync();
      }
      
      if (bgPerm.status !== 'granted') {
         useAlertStore.getState().showAlert(
           t("Background Tracking Required"),
           t("You must select 'Allow all the time' to punch in. This ensures your route activities are tracked. Please update your device settings."),
           [
             { 
               text: t("Open Settings"), 
               onPress: () => {
                 Linking.openSettings();
               } 
             }
           ]
         );
         setLocationStr(t("Location permission denied"));
         return; 
      }

      // Try to get a cached location first for instant loading
      let location = await Location.getLastKnownPositionAsync();
      
      if (!location) {
        // Fallback to active fetch if no cache exists
        location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced,
        });
      }
      
      setExactLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });

      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode.length > 0) {
        const place = geocode[0];
        const name = place.name || '';
        const street = place.street && place.street !== place.name ? place.street : '';
        const district = place.subregion || place.district || '';
        const city = place.city || '';
        const state = place.region || '';
        
        const detailedParts = [name, street, district, city, state].filter(p => p.trim() !== '');
        setLocationStr(detailedParts.slice(0, 4).join(', '));
      } else {
        setLocationStr(t("Location found, details unavailable"));
      }
    } catch (e) {
      setLocationStr(t("Unable to fetch location"));
    } finally {
      // 🚀 Release the lock when finished
      isFetchingLoc.current = false;
    }
  };

  useEffect(() => {
    let timer: any;
    if (visible && step === 1 && !showTimePicker) {
      timer = setInterval(() => setCurrentTime(new Date()), 1000);
    }
    return () => clearInterval(timer);
  }, [visible, step, showTimePicker]);

  // Handle baseline visibility and modal reset
  useEffect(() => {
    if (visible && step === 1) {
      checkLocationAndPermissions();
    } else if (!visible) {
      setStep(1); setIsPersonal(null); setStartKm(''); setTransitMode(''); setOdoImage(undefined);
    }
  }, [visible]);

  // 🚀 NEW FIX: Listen to AppState transitions. If user returns from settings, auto-retry verification!
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && visible && step === 1) {
        checkLocationAndPermissions();
      }
    });

    return () => subscription.remove();
  }, [visible, step]);

  // 🚀 Real Camera Launcher Logic (Camera Capture Only)
  const handleOdometerCapture = async () => {
    try {
      const perm = await requestCameraPermission();
      if (!perm.granted) {
        useAlertStore.getState().showAlert(t("Permission Denied"), perm.fallbackMessage);
        return;
      }

      setIsLaunchingCamera(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], 
        quality: 0.6,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setOdoImage(result.assets[0].uri);
      }
    } catch (error) {
      useAlertStore.getState().showAlert(t("Error"), t("Failed to open camera."));
    } finally {
      setIsLaunchingCamera(false);
    }
  };

  const handleFinalConfirm = async () => {
    if (isPersonal && !startKm) return;
    if (isPersonal === false && !transitMode) return;
    
    setIsCapturing(true);
    
    try {
      const actualTime = Date.now();
      const editedTime = isTimeEdited ? customTime.getTime() : null;
      
      await onConfirm(isPersonal, startKm, transitMode, odoImage, {
        vehicleType: isPersonal ? vehicleType : null,
        actualTime,
        editedTime,
        location: exactLocation,
        routeId: selectedRouteId === 'others' ? null : selectedRouteId
      });
      onClose();
    } catch (e: any) {
      const rawError = e.message?.toLowerCase() || "";
      let friendlyMessage = t("Failed to punch in. Please try again.");

      // 🚀 Map ugly technical errors to user-friendly explanations
      if (rawError.includes("unique_shift_per_day")) {
        friendlyMessage = t("You have already logged a shift today. You cannot punch in twice on the same day.");
      } else if (rawError.includes("network") || rawError.includes("fetch")) {
        friendlyMessage = t("Network connection issue. Please check your internet and try again.");
      } else if (rawError.includes("timeout")) {
        friendlyMessage = t("The request took too long. Please ensure you have a stable connection.");
      } else {
        // Log the actual error for developers, but don't show it to the user
        console.error("Punch In Failed:", e.message);
      }

      useAlertStore.getState().showAlert(
        t("Cannot Punch In"), 
        friendlyMessage
      );
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ backgroundColor: colors.surface, padding: spacing.xl, borderRadius: 24 }}>
          
          {/* Header row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 4 }}>
                {step === 1 ? t("Start Shift") : t("Transit Details")}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                {step === 1 ? t("Please verify your details before logging entry.") : t("Choose your transport profile for the day.")}
              </Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
              <MaterialIcons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          {/* STEP 1: TIME, DATE & COMPREHENSIVE LOCATION */}
          {step === 1 && (
            <View>
              <View style={{ marginBottom: spacing.xl, backgroundColor: '#F8FAFC', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}>
                
                {/* 🚀 REQ 3: Independent Date and Time Selectors */}
                {isTimeEdited && (
                  <View style={{ alignSelf: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: spacing.md }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#D97706', letterSpacing: 0.5 }}>{t("EDITED TIMESTAMP")}</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                  <Pressable 
                    onPress={() => { 
                      if (!isTimeEdited) setCustomTime(new Date());
                      setPickerMode('date'); 
                      setShowTimePicker(true); 
                    }} 
                    style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>{t("Punch In Date")}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                        {isTimeEdited ? customTime.toLocaleDateString() : currentTime.toLocaleDateString()}
                      </Text>
                      <MaterialIcons name="edit" size={16} color={colors.primary} />
                    </View>
                  </Pressable>

                  <Pressable 
                    onPress={() => { 
                      if (!isTimeEdited) setCustomTime(new Date());
                      setPickerMode('time'); 
                      setShowTimePicker(true); 
                    }} 
                    style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>{t("Punch In Time")}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                        {isTimeEdited ? customTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <MaterialIcons name="edit" size={16} color={colors.primary} />
                    </View>
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, width: '100%' }}>
                  <MaterialIcons name="my-location" size={18} color={colors.primary} style={{ marginRight: 8, flexShrink: 0 }} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, lineHeight: 18 }}>
                    {locationStr}
                  </Text>
                </View>
              </View>

              {/* 🚀 Safe Picker Update Logic */}
              {showTimePicker && (
                <DateTimePicker
                  value={customTime}
                  mode={pickerMode}
                  display="default"
                  maximumDate={pickerMode === 'date' ? new Date() : undefined}
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (event.type === 'set' && date) {
                      
                      if (pickerMode === 'date') {
                        if (date.getFullYear() === customTime.getFullYear() && 
                            date.getMonth() === customTime.getMonth() && 
                            date.getDate() === customTime.getDate()) {
                          return;
                        }
                      } else {
                        if (date.getHours() === customTime.getHours() && 
                            date.getMinutes() === customTime.getMinutes()) {
                          return; 
                        }
                      }

                      let newDate = new Date(customTime.getTime());
                      
                      if (pickerMode === 'date') {
                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      } else {
                        newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                      }

                      if (newDate.getTime() > Date.now()) {
                        useAlertStore.getState().showAlert(
                           t("Invalid Selection"),
                           t("You cannot select a future date or time.")
                        );
                        return;
                      }

                      setCustomTime(newDate);
                      setIsTimeEdited(true);
                    }
                  }}
                />
              )}

              <Button 
                label={locationStr.includes('Locating') || locationStr.includes('Fetching') ? t("Detecting Location...") : t("Punch In")} 
                onPress={() => setStep(2)} 
                disabled={locationStr.includes('Locating') || locationStr.includes('Fetching') || locationStr.includes('denied')}
                icon="touch-app"
                bounceIcon={true}
              />
            </View>
          )}

          {/* STEP 2: TRANSIT LOGISTICS FORM */}
          {step === 2 && (
            <View>
              {/* 🚀 ROUTE SELECTION (Mandatory) */}
              <View style={{ marginBottom: spacing.md }}>
                <SelectField
                  label="Select Route *" 
                  options={[
                    ...routes.map((route) => formatRouteLabel(route)),
                    "Others"
                  ]}
                  value={
                    selectedRouteId === 'others'
                      ? "Others"
                      : selectedRouteId 
                        ? formatRouteLabel(routes.find(r => r.id === selectedRouteId)) 
                        : "" // Blank until they select something
                  }
                  onChange={(selectedLabel: string) => {
                    if (selectedLabel === "Others") {
                      setSelectedRouteId('others');
                    } else {
                      const matchedRoute = routes.find(r => formatRouteLabel(r) === selectedLabel);
                      setSelectedRouteId(matchedRoute ? matchedRoute.id : null);
                    }
                  }}
                  placeholder="Choose a route..."
                />
              </View>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
                {t("Are you traveling by personal vehicle?")}
              </Text>

              <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Button label={t("Yes")} variant={isPersonal === true ? "primary" : "secondary"} onPress={() => setIsPersonal(true)} icon="directions-car" />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={t("No")} variant={isPersonal === false ? "primary" : "secondary"} onPress={() => setIsPersonal(false)} icon="directions-bus" />
                </View>
              </View>

              {isPersonal === true && (
                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
                    {t("Select Vehicle Type")}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                    <Pressable 
                      onPress={() => setVehicleType('two-wheeler')} 
                      style={{ flex: 1, padding: spacing.sm, borderWidth: 2, borderColor: vehicleType === 'two-wheeler' ? colors.primary : colors.border, borderRadius: radius.md, alignItems: 'center', backgroundColor: vehicleType === 'two-wheeler' ? colors.primarySoft : '#F8FAFC' }}
                    >
                      <MaterialIcons name="two-wheeler" size={24} color={vehicleType === 'two-wheeler' ? colors.primary : colors.textMuted} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: vehicleType === 'two-wheeler' ? colors.primary : colors.textMuted, marginTop: 4 }}>{t("Two-Wheeler")}</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setVehicleType('four-wheeler')} 
                      style={{ flex: 1, padding: spacing.sm, borderWidth: 2, borderColor: vehicleType === 'four-wheeler' ? colors.primary : colors.border, borderRadius: radius.md, alignItems: 'center', backgroundColor: vehicleType === 'four-wheeler' ? colors.primarySoft : '#F8FAFC' }}
                    >
                      <MaterialIcons name="directions-car" size={24} color={vehicleType === 'four-wheeler' ? colors.primary : colors.textMuted} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: vehicleType === 'four-wheeler' ? colors.primary : colors.textMuted, marginTop: 4 }}>{t("Four-Wheeler")}</Text>
                    </Pressable>
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>{t("Enter Starting KM")}</Text>
                  <TextInput 
                    value={startKm} onChangeText={setStartKm} keyboardType="numeric" placeholder="e.g. 14500"
                    placeholderTextColor={colors.textMuted}
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}
                  />
                  
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
                    {t("Odometer Photo (Optional)")}
                  </Text>

                  {odoImage ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md }}>
                      <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14, flex: 1, marginLeft: 8 }}>
                        {t("Photo Captured Successfully")}
                      </Text>
                      <Pressable onPress={() => setOdoImage(undefined)} style={{ padding: 4 }}>
                        <MaterialIcons name="delete" size={22} color={colors.danger} />
                      </Pressable>
                    </View>
                  ) : isLaunchingCamera ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ marginLeft: 8, color: colors.text, fontWeight: '700' }}>{t("Opening Camera...")}</Text>
                    </View>
                  ) : (
                    <Pressable 
                      onPress={handleOdometerCapture} 
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}
                    >
                      <MaterialIcons name="photo-camera" size={22} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>{t("Take Odometer Photo")}</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {isPersonal === false && (
                <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{t("Select Transit Mode")}</Text>
                  {['Public Transport', 'Sharing', 'No Travelling'].map(mode => (
                    <Pressable key={mode} onPress={() => setTransitMode(mode)} style={{ padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: transitMode === mode ? colors.primary : colors.border, backgroundColor: transitMode === mode ? colors.primarySoft : colors.surface }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: transitMode === mode ? colors.primary : colors.text }}>{t(mode)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

<Button 
                label={isCapturing ? t("Punching in...") : t("Confirm")} 
                disabled={
                  !selectedRouteId || // 🚀 NEW: Route selection is now strictly mandatory
                  isPersonal === null || 
                  (isPersonal && !startKm) || 
                  (isPersonal === false && !transitMode) || 
                  isCapturing || 
                  isLaunchingCamera
                }
                onPress={handleFinalConfirm} 
              />
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};