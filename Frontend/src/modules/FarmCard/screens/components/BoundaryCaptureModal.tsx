// src/modules/FarmCard/screens/components/BoundaryCaptureModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator, TextInput, LayoutAnimation, UIManager, Platform } from 'react-native';
import MapView, { Polygon, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import ViewShot from 'react-native-view-shot';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../../design-system/tokens';
import { Button } from '../../../../design-system/components';
import { useAlertStore } from '../../../../store/alertStore';

export const BoundaryCaptureModal = ({ visible, onClose, onSave }: any) => {
  const { t } = useTranslation();
  const viewShotRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  const [captureMode, setCaptureMode] = useState<'walk' | 'draw'>('walk');
  const [region, setRegion] = useState<Region | null>(null);
  const [path, setPath] = useState<{ latitude: number, longitude: number }[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 🚀 NEW: Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const ZOOM_DELTA = 0.0005; 

  useEffect(() => {
    if (visible) {
      setPath([]);
      setIsTracking(false);
      setCaptureMode('walk');
      setSearchQuery("");
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

  // 🚀 Switch between Walk and Draw modes with smooth animation
  const switchMode = (mode: 'walk' | 'draw') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isTracking) stopTracking();
    setPath([]);
    setCaptureMode(mode);
  };

  // 🚀 FIXED: Search & Geocode function with map camera animation
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const geocoded = await Location.geocodeAsync(searchQuery);
      if (geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        const targetRegion = { 
          latitude, 
          longitude, 
          latitudeDelta: ZOOM_DELTA, 
          longitudeDelta: ZOOM_DELTA 
        };
        
        // Update local state
        setRegion(targetRegion);
        
        // 🚀 FORCE THE MAP TO FLY THERE
        if (mapRef.current) {
          mapRef.current.animateToRegion(targetRegion, 1000);
        }
        
      } else {
        useAlertStore.getState().showAlert("Not Found", "Could not find that location on the map.");
      }
    } catch (error) {
      console.error(error);
      useAlertStore.getState().showAlert("Search Error", "Failed to search location. Check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      useAlertStore.getState().showAlert("Permission Denied", "Location is required to plot boundary.");
      return;
    }
    setPath([]);
    setIsTracking(true);
    
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
      (loc) => {
        setPath((prev) => [...prev, { latitude: loc.coords.latitude, longitude: loc.coords.longitude }]);
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
    
    if (path.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(path, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const handleMapPress = (e: any) => {
    if (captureMode === 'draw') {
      const newCoordinate = e.nativeEvent.coordinate;
      setPath((prev) => [...prev, newCoordinate]);
    }
  };

  const handleUndo = () => {
    setPath((prev) => prev.slice(0, -1));
  };

  const handleCaptureAndSave = async () => {
    setIsSaving(true);
    try {
      if (path.length > 0 && mapRef.current) {
        mapRef.current.fitToCoordinates(path, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: false, 
        });
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
        
        {/* 🚀 ENHANCED: Top Bar with Search (Only in Draw Mode) */}
        <View style={{ position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
           <Pressable onPress={onClose} style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 24 }}>
             <MaterialIcons name="close" size={24} color="#FFF" />
           </Pressable>

           {captureMode === 'draw' && (
             <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 24, paddingHorizontal: 16, alignItems: 'center' }}>
               <MaterialIcons name="search" size={20} color="#CBD5E1" style={{ marginRight: 8 }} />
               <TextInput 
                 style={{ flex: 1, color: '#FFF', paddingVertical: 12, fontSize: 14, fontWeight: '600' }}
                 placeholder={t("Search village or location...")}
                 placeholderTextColor="#CBD5E1"
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 onSubmitEditing={handleSearch}
                 returnKeyType="search"
               />
               {isSearching && <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 8 }} />}
             </View>
           )}
        </View>

        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }} style={{ flex: 1 }}>
          {region ? (
            <MapView
              ref={mapRef} 
              provider={PROVIDER_GOOGLE}
              mapType="hybrid"
              style={{ flex: 1 }}
              region={captureMode === 'walk' && isTracking ? region : undefined}
              initialRegion={region} 
              onPress={handleMapPress} 
              showsUserLocation={true}
              showsMyLocationButton={true}
              pitchEnabled={false} 
            >
              {path.length > 0 && (
                <Polygon coordinates={path} strokeColor={colors.primary} fillColor="rgba(34, 197, 94, 0.4)" strokeWidth={3} />
              )}
              {captureMode === 'draw' && path.map((pt, i) => (
                <Marker key={i} coordinate={pt} anchor={{x: 0.5, y: 0.5}}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF', borderWidth: 3, borderColor: colors.primary, ...shadows.soft }} />
                </Marker>
              ))}
            </MapView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </ViewShot>

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.xl, borderTopLeftRadius: 28, borderTopRightRadius: 28, ...shadows.medium }}>
          
          {/* 🚀 MODE SELECTOR WITH ICONS */}
          <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: radius.md, padding: 4, marginBottom: spacing.md }}>
            <Pressable onPress={() => switchMode('walk')} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', padding: 12, backgroundColor: captureMode === 'walk' ? '#FFF' : 'transparent', borderRadius: radius.sm, alignItems: 'center', elevation: captureMode === 'walk' ? 2 : 0 }}>
              <MaterialIcons name="directions-walk" size={18} color={captureMode === 'walk' ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '800', color: captureMode === 'walk' ? colors.primary : colors.textMuted }}>{t("Walk Perimeter")}</Text>
            </Pressable>
            <Pressable onPress={() => switchMode('draw')} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', padding: 12, backgroundColor: captureMode === 'draw' ? '#FFF' : 'transparent', borderRadius: radius.sm, alignItems: 'center', elevation: captureMode === 'draw' ? 2 : 0 }}>
              <MaterialIcons name="touch-app" size={18} color={captureMode === 'draw' ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '800', color: captureMode === 'draw' ? colors.primary : colors.textMuted }}>{t("Draw on Map")}</Text>
            </Pressable>
          </View>

          <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 8, color: colors.text }}>
            {captureMode === 'walk' 
              ? (isTracking ? t("Walking Perimeter...") : t("GPS Perimeter Walk"))
              : t("Manual Map Draw")}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg }}>
            {captureMode === 'walk'
              ? t("Walk along the exact edge boundary of the farm. The satellite view will plot your physical perimeter.")
              : t("Search a location, pan the map, and tap on the corners of the field to manually draw the boundary.")}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
             <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center' }}>
               <MaterialIcons name="place" size={14} color={colors.text} style={{ marginRight: 4 }} />
               <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{path.length} {t("Points Plotted")}</Text>
             </View>
          </View>

          {/* 🚀 DYNAMIC ACTION BUTTONS */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {captureMode === 'walk' ? (
              <>
                {!isTracking ? (
                  <View style={{ flex: 1 }}>
                    <Button icon="play-arrow" label={path.length > 0 ? t("Re-Start Walk") : t("Start Walk")} onPress={startTracking} />
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Button icon="stop" label={t("Stop Recording")} variant="danger" onPress={stopTracking} />
                  </View>
                )}
                
                {path.length > 3 && !isTracking && (
                  <View style={{ flex: 1 }}>
                    <Button icon="check" label={t("Lock Boundary")} variant="primary" onPress={handleCaptureAndSave} loading={isSaving} />
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Button 
                    icon="undo"
                    label={t("Undo")} 
                    onPress={handleUndo} 
                    disabled={path.length === 0} 
                    style={{ backgroundColor: '#94A3B8' }} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button 
                    icon="delete"
                    label={t("Clear")} 
                    variant="danger" 
                    onPress={() => setPath([])} 
                    disabled={path.length === 0} 
                  />
                </View>
                {path.length >= 3 && (
                  <View style={{ flex: 1 }}>
                    <Button icon="check" label={t("Lock")} variant="primary" onPress={handleCaptureAndSave} loading={isSaving} />
                  </View>
                )}
              </>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
};