// src/modules/FarmCard/screens/steps/Step5MediaAndDigital.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, Modal } from 'react-native'; // 🚀 Added Modal import
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckboxItem } from '../../../../design-system/components';
import { spacing, colors, radius } from '../../../../design-system/tokens';
import { BoundaryCaptureModal } from '../components/BoundaryCaptureModal';

export const Step5MediaAndDigital = ({ form, t, handleCameraUpload, handleBoundaryCapture, uploading }: any) => {
  const { watch, control, setValue, getValues } = form;
  const docs: Record<string, any> = watch('documents') || {};
  const boundaryPolygon = watch('boundary_polygon') || [];

  const [boundaryModalVisible, setBoundaryModalVisible] = useState(false);
  
  // 🚀 NEW: State to hold the URI of the image being viewed in full screen
  const [expandedImageUri, setExpandedImageUri] = useState<string | null>(null);
  
  const digitalList = [
    "Smartphone (Android/iOS)", 
    "KisanSeva / e-NAM / AgriMarket App", 
    "PM Kisan / Soil Health Card Portal", 
    "Weather App (IMD/Meghdoot)", 
    "Drone Spraying Service", 
    "Online Market for Selling Produce", 
    "WhatsApp / Telegram Groups (Agri)", 
    "GPS / GIS Survey for Land"
  ];

  const renderPhotoTask = (key: string, label: string, desc: string, allowVideo: boolean = false) => (
    <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
      <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm }}>{desc}</Text>
      
      {docs[key] ? (
        <View style={{ borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: '#BBF7D0' }}>
          
          {/* 🚀 NEW: Wrapped the Image in a Pressable to trigger the Full Screen Viewer */}
          <Pressable onPress={() => setExpandedImageUri(docs[key])}>
            <Image 
              source={{ uri: docs[key] }} 
              style={{ width: '100%', height: 180, resizeMode: 'cover' }} 
            />
            {/* Overlay icon to hint that it is clickable */}
            <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
              <MaterialIcons name="zoom-out-map" size={18} color="#FFF" />
            </View>
          </Pressable>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', padding: 12 }}>
            <MaterialIcons name="check-circle" size={24} color="#16A34A" />
            <Text style={{ color: "#16A34A", fontWeight: '800', flex: 1, marginLeft: 8 }}>
               {key === 'field_boundary' ? t("Boundary Snapshot Saved") : t("Media Captured")}
            </Text>
            <Pressable onPress={() => { 
              const d = {...docs}; delete d[key]; 
              setValue('documents', d, {shouldValidate: true, shouldDirty: true}); 

              const currentGps = getValues('media_gps') || {};
              const g = { ...currentGps };
              delete g[key];
              setValue('media_gps', g, { shouldDirty: true });

              if (key === 'field_boundary') setValue('boundary_polygon', [], {shouldDirty: true});
            }}>
              <MaterialIcons name="delete" size={24} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      ) : key === 'field_boundary' ? (
        <Pressable onPress={() => setBoundaryModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md }}>
          {uploading[key] ? <ActivityIndicator color={colors.primary} /> : <><MaterialIcons name="satellite" size={22} color={colors.primary} style={{ marginRight: 6 }} /><Text style={{ color: colors.primary, fontWeight: '800' }}>{t("Start Boundary Walk")}</Text></>}
        </Pressable>
      ) : (
        <Pressable onPress={() => handleCameraUpload(key, allowVideo)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md }}>
          {uploading[key] ? <ActivityIndicator color={colors.primary} /> : <><MaterialIcons name={allowVideo ? "perm-media" : "camera-alt"} size={22} color={colors.primary} style={{ marginRight: 6 }} /><Text style={{ color: colors.primary, fontWeight: '800' }}>{allowVideo ? t("Open Camera / Video") : t("Open Camera")}</Text></>}
        </Pressable>
      )}
    </View>
  );

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Validation & Digital")}</Text>
      
      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("PHOTOGRAPHIC VALIDATION")}</Text>
      
      {renderPhotoTask('field_boundary', 'Task 1: Physical Field Boundary', 'Walk the perimeter of the field. The app will capture the path and generate a satellite view screenshot.')}
      {renderPhotoTask('soil_squeeze', 'Task 2: Soil Squeeze Test', 'Capture a photo or a short video (max 15s) of the physical soil squeeze test.', true)}
      {renderPhotoTask('lab_report', 'Task 3: pH/EC Verification', 'The lab report or pocket meter reading screen confirming baseline pH.')}

      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.lg }}>{t("Digital Adoption Checklist")}</Text>
      <Controller control={control} name="digitalAdoption" render={({field}) => (
        <View>
          {digitalList.map(item => (
            <CheckboxItem key={item} label={item} checked={field.value?.includes(item)} onChange={(checked: boolean) => {
              const set = new Set(field.value || []);
              checked ? set.add(item) : set.delete(item);
              field.onChange(Array.from(set));
            }} />
          ))}
        </View>
      )} />

      {/* Boundary Capture Modal */}
      <BoundaryCaptureModal 
        visible={boundaryModalVisible} 
        onClose={() => setBoundaryModalVisible(false)} 
        onSave={handleBoundaryCapture} 
      />

      {/* 🚀 NEW: Full Screen Image Viewer Modal */}
      <Modal 
        visible={!!expandedImageUri} 
        transparent={true} 
        animationType="fade" 
        onRequestClose={() => setExpandedImageUri(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable 
            onPress={() => setExpandedImageUri(null)} 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24 }}
          >
            <MaterialIcons name="close" size={28} color="#FFF" />
          </Pressable>
          
          {expandedImageUri && (
            <Image 
              source={{ uri: expandedImageUri }} 
              style={{ width: '100%', height: '80%', resizeMode: 'contain' }} 
            />
          )}
        </View>
      </Modal>
    </View>
  );
};