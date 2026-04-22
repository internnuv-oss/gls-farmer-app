import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Props = {
  title: string;
  onEdit: () => void;
  onDelete: () => void;
};

export const UploadedFileCard: React.FC<Props> = ({ title, onEdit, onDelete }) => (
  <View style={{ borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
        <MaterialIcons name="check-circle" size={24} color="#16A34A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: '#166534', marginTop: 2, fontSize: 12, fontWeight: '600' }}>Uploaded Successfully</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Pressable onPress={onEdit} style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="edit" size={18} color={colors.primary} />
        </Pressable>
        <Pressable onPress={onDelete} style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="delete" size={18} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  </View>
);