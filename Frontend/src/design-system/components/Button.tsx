import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "../tokens";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
};

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  icon,
}) => {
  const getBgColor = () => {
    if (disabled) return "#E2E8F0"; // Light gray when disabled
    if (variant === "secondary") return colors.primarySoft;
    if (variant === "danger") return colors.danger;
    return colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return "#94A3B8"; // Darker gray text when disabled
    if (variant === "secondary") return colors.primary;
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
          height: 56, // Enforced fixed height
          width: "100%", // Enforced full width
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          // Shadows for depth
          elevation: disabled ? 0 : 3,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: disabled ? 0 : 0.1,
          shadowRadius: 4,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && (
            <MaterialIcons
              name={icon}
              size={18}
              color={getTextColor()}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={{ color: getTextColor(), fontWeight: "800", fontSize: 16 }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
