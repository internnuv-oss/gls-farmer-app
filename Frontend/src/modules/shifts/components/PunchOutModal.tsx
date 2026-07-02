import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../../../design-system/tokens';
import { Button } from '../../../design-system/components';
import { useShiftStore } from '../../../store/shiftStore';
import { requestCameraPermission } from '../../../core/permissions';
import { useAlertStore } from '../../../store/alertStore';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

// Helper to check if calendar day has changed
const isDayChanged = (startTimeMs: number | null, currentTime: Date) => {
  if (!startTimeMs) return false;
  const startDate = new Date(startTimeMs);
  return startDate.getDate() !== currentTime.getDate() ||
    startDate.getMonth() !== currentTime.getMonth() ||
    startDate.getFullYear() !== currentTime.getFullYear();
};

export const PunchOutModal = ({ visible, onClose, onConfirm }: any) => {
  const { t } = useTranslation();
  // 🚀 Added transitMode to store destructuring
  const { isPersonalVehicle, startKm, activitiesLogged, transitMode, startTime } = useShiftStore();
  const [endKm, setEndKm] = useState('');
  const [error, setError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const [customTime, setCustomTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isTimeEdited, setIsTimeEdited] = useState(false);

  const [comment, setComment] = useState('');

  const [locationStr, setLocationStr] = useState(t("Locating..."));
  const [exactLocation, setExactLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (visible) {
      setCustomTime(new Date());
      setIsTimeEdited(false);
      setComment('');

      (async () => {
        try {
          setLocationStr(t("Fetching location..."));
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setLocationStr(t("Location permission denied"));
            return;
          }
          let location = await Location.getLastKnownPositionAsync();

          if (!location) {
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
        }
      })();
    } else {
      setLocationStr(t("Locating..."));
      setExactLocation(null);
    }
  }, [visible]);

  const [odoImage, setOdoImage] = useState<string | undefined>(undefined);
  const [isLaunchingCamera, setIsLaunchingCamera] = useState(false);

  const handleConfirm = async () => {
    if (isPersonalVehicle) {
      if (!endKm) { setError(t("Ending KM is required.")); return; }
      if (parseFloat(endKm) < parseFloat(startKm)) {
        setError(t("Ending KM cannot be less than Starting KM ({{km}}).", { km: startKm }));
        return;
      }
    }

    setError('');
    setIsCapturing(true);

    try {
      const actualTime = Date.now();
      const editedTime = isTimeEdited ? customTime.getTime() : null;

      // 🚀 Pass the comment payload up ONLY if both conditions are met
      await onConfirm(endKm, odoImage, {
        actualTime,
        editedTime,
        location: exactLocation,
        comment: (activitiesLogged === 0 && transitMode === 'No Travelling') ? comment.trim() : undefined
      });

      setEndKm('');
      setOdoImage(undefined);
    } catch (e) {
      useAlertStore.getState().showAlert(t("Error"), t("Failed to punch out."));
    } finally {
      setIsCapturing(false);
    }
  };

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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface, padding: spacing.xl, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>{t("End Shift")}</Text>
            <Pressable onPress={() => { if (!isLaunchingCamera && !isCapturing) onClose(); }}><MaterialIcons name="close" size={24} color={colors.textMuted} /></Pressable>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            {isTimeEdited && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: spacing.sm }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#D97706', letterSpacing: 0.5 }}>{t("EDITED TIMESTAMP")}</Text>
              </View>
            )}

            {/* 🚀 NEW: Crossover Shift Warning Block */}
            {isDayChanged(startTime, customTime) && (
              <View style={{ backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#FCA5A5', marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="error-outline" size={20} color={colors.danger} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger, flex: 1, lineHeight: 16 }}>
                  {t("Attention: You are punching out on a different day from your punch-in. You must change the Date and Time to yesterday's closing parameters before submitting.")}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable onPress={() => { setPickerMode('date'); setShowTimePicker(true); }} style={{ flex: 1, backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>{t("Punch Out Date")}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                    {customTime.toLocaleDateString()}
                  </Text>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                </View>
              </Pressable>

              <Pressable onPress={() => { setPickerMode('time'); setShowTimePicker(true); }} style={{ flex: 1, backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>{t("Punch Out Time")}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                    {customTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                </View>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, width: '100%', marginBottom: spacing.lg }}>
            <MaterialIcons name="my-location" size={18} color={colors.primary} style={{ marginRight: 8, flexShrink: 0 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, lineHeight: 18 }}>
              {locationStr}
            </Text>
          </View>

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

          {isPersonalVehicle ? (
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
                {t("Enter Ending KM")} (Start: {startKm} km)
              </Text>
              <TextInput
                value={endKm} onChangeText={(val) => { setEndKm(val); setError(''); }} keyboardType="numeric" placeholder="e.g. 14550"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: error ? colors.danger : colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}
              />
              {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: -4, marginBottom: spacing.md, fontWeight: '600' }}>{error}</Text> : null}

              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
                {t("Odometer Photo (Optional)")}
              </Text>

              {odoImage ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md }}>
                  <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14, flex: 1, marginLeft: 8 }}>
                    {t("End Odometer Photo Attached")}
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
          ) : (
            <Text style={{ fontSize: 15, color: colors.text, marginBottom: spacing.lg, fontWeight: '500' }}>
              {t("You are about to close your shift. We will capture your end time and location.")}
            </Text>
          )}

          {/* 🚀 ONLY SHOW IF NO ACTIVITIES LOGGED AND TRANSIT IS 'NO TRAVELLING' */}
          {activitiesLogged === 0 && transitMode === 'No Travelling' && (
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: spacing.sm }}>
                {t("What did you do today?")} <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
                {t("Since no field activities were logged, please provide a brief summary of your work (e.g., Office day, meetings).")}
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                placeholder={t("Enter your work summary...")}
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, textAlignVertical: 'top', minHeight: 80, fontWeight: '600' }}
              />
            </View>
          )}

          <Button
            label={locationStr.includes('Locating') || locationStr.includes('Fetching') ? t("Detecting Location...") : (isCapturing ? t("Closing Shift...") : t("Punch Out"))}
            variant="danger"
            onPress={handleConfirm}
            // 🚀 Safety restriction locks submission if calendar day has changed
            disabled={
              isCapturing ||
              isLaunchingCamera ||
              locationStr.includes('Locating') ||
              locationStr.includes('Fetching') ||
              locationStr.includes('denied') ||
              isDayChanged(startTime, customTime) || // Blocks punch out completely
              (activitiesLogged === 0 && transitMode === 'No Travelling' && comment.trim() === '')
            }
          />
        </View>
      </View>
    </Modal>
  );
};