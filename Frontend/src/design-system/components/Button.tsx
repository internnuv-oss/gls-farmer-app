import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  Animated
} from "react-native";
import { colors, radius, spacing } from "../tokens";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "text"; // Added 'text' variant for plain buttons
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  iconPosition?: "left" | "right"; // <-- Added iconPosition prop
  bounceIcon?: boolean;
};

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  icon,
  iconPosition = "left", // Defaults to left
  bounceIcon = false,
}) => {
  // 🚀 ADD ANIMATION REF & EFFECT
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (bounceIcon && !disabled && !loading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -4, duration: 400, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      bounceAnim.setValue(0);
    }
  }, [bounceIcon, disabled, loading]);

  const getBgColor = () => {
    if (disabled) return "#E2E8F0"; 
    if (variant === "secondary") return colors.primarySoft;
    if (variant === "danger") return colors.danger;
    if (variant === "text") return "transparent";
    return colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return "#94A3B8"; 
    if (variant === "secondary" || variant === "text") return colors.primary;
    return "#FFFFFF";
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: getBgColor(),
          height: variant === "text" ? undefined : 56, 
          width: variant === "text" ? undefined : "100%", 
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: variant === "text" ? 0 : spacing.md,
          elevation: disabled || variant === "text" ? 0 : 3,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: disabled || variant === "text" ? 0 : 0.1,
          shadowRadius: 4,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {/* 🚀 WRAPPED LEFT ICON IN ANIMATED VIEW */}
          {icon && iconPosition === "left" && (
            <Animated.View style={bounceIcon && !disabled ? { transform: [{ translateY: bounceAnim }] } : {}}>
              <MaterialIcons
                name={icon}
                size={18}
                color={getTextColor()}
                style={{ marginRight: 8 }}
              />
            </Animated.View>
          )}
          
          <Text style={{ color: getTextColor(), fontWeight: "800", fontSize: 16 }}>
            {label}
          </Text>

          {/* 🚀 WRAPPED RIGHT ICON IN ANIMATED VIEW */}
          {icon && iconPosition === "right" && (
            <Animated.View style={bounceIcon && !disabled ? { transform: [{ translateY: bounceAnim }] } : {}}>
              <MaterialIcons
                name={icon}
                size={18}
                color={getTextColor()}
                style={{ marginLeft: 8 }}
              />
            </Animated.View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};