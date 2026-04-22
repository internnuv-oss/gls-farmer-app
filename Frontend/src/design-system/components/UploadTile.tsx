import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  value?: string;
  loading?: boolean;
  onUpload: (source: 'camera' | 'doc') => void;
  onClear: () => void;
};

export const UploadTile: React.FC<Props> = ({ value, loading, onUpload, onClear }) => {
  // If a document has already been uploaded successfully
  if (value) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md }}>
        <MaterialIcons name="check-circle" size={28} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>Document Uploaded</Text>
        </View>
        <Pressable onPress={onClear} style={{ padding: 8 }}>
          <MaterialIcons name="delete" size={22} color={colors.danger} />
        </Pressable>
      </View>
    );
  }

  // Loading State
  if (loading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ marginLeft: 8, color: colors.text, fontWeight: '700' }}>Uploading...</Text>
      </View>
    );
  }

  // Default State with Two Options
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Pressable 
        onPress={() => onUpload('camera')} 
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}
      >
        <MaterialIcons name="camera-alt" size={22} color={colors.textMuted} />
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>Camera</Text>
      </Pressable>
      
      <Pressable 
        onPress={() => onUpload('doc')} 
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}
      >
        <MaterialIcons name="upload-file" size={22} color={colors.textMuted} />
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>Upload</Text>
      </Pressable>
    </View>
  );
};