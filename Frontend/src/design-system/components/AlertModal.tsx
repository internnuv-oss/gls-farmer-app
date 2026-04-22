import React, { useEffect, useRef } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, radius, shadows, typography, spacing } from "../tokens";

type AlertModalProps = {
  visible: boolean;
  title: string;
  message: string;
  tone?: "danger" | "warning" | "success" | "info";
  onClose: () => void;
  actionLabel?: string;
};

export const AlertModal: React.FC<AlertModalProps> = ({
  visible, title, message, tone = "danger", onClose, actionLabel = "Try Again"
}) => {
  const scaleValue = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
    } else {
      scaleValue.setValue(0.9);
    }
  }, [visible, scaleValue]);

  const toneConfig = {
    danger: { icon: "error-outline", color: colors.danger, bg: "#FEE2E2" },
    warning: { icon: "warning", color: "#D97706", bg: "#FEF3C7" },
    success: { icon: "check-circle", color: colors.success, bg: "#DCFCE7" },
    info: { icon: "info-outline", color: colors.primary, bg: colors.primarySoft },
  };
  const config = toneConfig[tone];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleValue }] }]}>
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <MaterialIcons name={config.icon as any} size={40} color={config.color} />
          </View>
          <Text style={[typography.headingMd, styles.title]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.65)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "90%", maxWidth: 340, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, alignItems: "center", ...shadows.soft, elevation: 10 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: colors.text, marginBottom: 8, textAlign: 'center' },
  message: { color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  button: { paddingVertical: 12, paddingHorizontal: 32, width: '100%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  buttonText: { fontWeight: '700', color: colors.text, fontSize: 15 }
});