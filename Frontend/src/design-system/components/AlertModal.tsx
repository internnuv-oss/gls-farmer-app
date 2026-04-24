import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../tokens';
import { Button } from './Button';

export interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | string;
    onPress: () => void;
  }[];
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ 
  visible, 
  title, 
  message, 
  buttons = [], 
  onClose 
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {buttons.length > 0 ? (
              buttons.map((btn, index) => (
                <View key={index} style={{ flex: 1, marginLeft: index > 0 ? spacing.sm : 0 }}>
                  <Button 
                    label={btn.label} 
                    variant={btn.variant as any} 
                    onPress={btn.onPress} 
                  />
                </View>
              ))
            ) : (
              // Fallback default button just in case
              <View style={{ flex: 1 }}>
                <Button label="OK" onPress={onClose} />
              </View>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  message: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
});