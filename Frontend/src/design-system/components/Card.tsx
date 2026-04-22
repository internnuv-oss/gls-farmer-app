import { ReactNode } from "react";
import { View } from "react-native";

export function Card({ children }: { children: ReactNode }) {
  return <View className="rounded-soft bg-white p-4 shadow-sm">{children}</View>;
}
