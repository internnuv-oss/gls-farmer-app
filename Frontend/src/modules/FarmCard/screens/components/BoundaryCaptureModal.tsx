// src/modules/FarmCard/screens/components/BoundaryCaptureModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import ViewShot from 'react-native-view-shot';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { Button } from '../../../../design-system/components';
import { useAlertStore } from '../../../../store/alertStore';

export const BoundaryCaptureModal = ({ visible, onClose, onSave }: any) => {
  const { t } = useTranslation();
  const viewShotRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null); // 🚀 NEW: Reference to control the Map camera
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  const [region, setRegion] = useState<Region | null>(null);
  const [path, setPath] = useState<{ latitude: number, longitude: number }[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🚀 Much smaller deltas = Much higher zoom level
  const ZOOM_DELTA = 0.0005; 

  useEffect(() => {
    if (visible) {
      setPath([]);
      setIsTracking(false);
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
        setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: ZOOM_DELTA, longitudeDelta: ZOOM_DELTA });
      })();
    } else {
      stopTracking();
    }
  }, [visible]);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      useAlertStore.getState().showAlert("Permission Denied", "Location is required to plot boundary.");
      return;
    }
    setPath([]);
    setIsTracking(true);
    
    // 🚀 Maxed out accuracy and frequency
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
      (loc) => {
        setPath((prev) => [...prev, { latitude: loc.coords.latitude, longitude: loc.coords.longitude }]);
        // Keep the map centered and highly zoomed in on the user while walking
        setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: ZOOM_DELTA, longitudeDelta: ZOOM_DELTA });
      }
    );
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (locationSub.current) {
      locationSub.current.remove();
      locationSub.current = null;
    }
    
    // 🚀 NEW: When they stop walking, instantly auto-zoom the map to perfectly frame the drawn field
    if (path.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(path, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const handleCaptureAndSave = async () => {
    setIsSaving(true);
    try {
      // 🚀 Just to be 100% safe, re-frame the field perfectly before taking the screenshot
      if (path.length > 0 && mapRef.current) {
        mapRef.current.fitToCoordinates(path, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: false, // Turn off animation for instant snap readiness
        });
        
        // Give the map 500ms to finish rendering the new bounds
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const uri = await viewShotRef.current.capture();
      onSave(uri, path);
      onClose();
    } catch (e) {
      useAlertStore.getState().showAlert("Error", "Failed to capture map snapshot.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
           <Pressable onPress={onClose} style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 }}>
             <MaterialIcons name="close" size={24} color="#FFF" />
           </Pressable>
        </View>

        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }} style={{ flex: 1 }}>
          {region ? (
            <MapView
              ref={mapRef} // 🚀 Bind the ref
              provider={PROVIDER_GOOGLE}
              mapType="satellite"
              style={{ flex: 1 }}
              region={region}
              showsUserLocation={true}
              showsMyLocationButton={false}
              pitchEnabled={false} // Lock to top-down 2D view for better screenshots
            >
              {path.length > 0 && (
                <Polygon coordinates={path} strokeColor={colors.primary} fillColor="rgba(34, 197, 94, 0.4)" strokeWidth={3} />
              )}
            </MapView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </ViewShot>

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.xl, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 8, color: colors.text }}>
            {isTracking ? t("Walking Perimeter...") : t("Field Boundary Capture")}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg }}>
            {t("Walk along the exact edge boundary of the farm. The satellite view will plot your physical perimeter.")}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
             <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
               <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{path.length} {t("Points Plotted")}</Text>
             </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {!isTracking ? (
              <View style={{ flex: 1 }}>
                <Button label={path.length > 0 ? t("Re-Start Walk") : t("Start Walk")} onPress={startTracking} />
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Button label={t("Stop Recording")} variant="danger" onPress={stopTracking} />
              </View>
            )}
            
            {path.length > 3 && !isTracking && (
              <View style={{ flex: 1 }}>
                <Button label={t("Lock Boundary")} variant="primary" onPress={handleCaptureAndSave} loading={isSaving} />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};