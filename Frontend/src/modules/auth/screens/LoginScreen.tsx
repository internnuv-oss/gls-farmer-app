import React from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react-native";
import { Controller } from "react-hook-form";
import { useLoginForm } from "../hooks";
import { Input } from "../../../design-system/components/Input";
import { Button } from "../../../design-system/components/Button";
import { colors, spacing } from "../../../design-system/tokens";
import { useAlertStore } from "../../../store/alertStore"; // <-- IMPORT STORE

export const LoginScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  
  // Cleaned up local modal state!
  const { form, submit, loading } = useLoginForm(
    () => {},
    (err) => useAlertStore.getState().showAlert(t("Login Failed"), err) // <-- USE GLOBAL STORE
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing["2xl"] }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
            <Leaf size={32} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text }}>{t("Welcome Back")}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 15, textAlign: "center" }}>{t("Login to manage your territory")}</Text>
        </View>

        <Controller
          control={form.control}
          name="mobile"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label={t("Mobile Number")}
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              prefix="+91"
              icon="phone"
              placeholder="98765 43210"
              maxLength={10}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label={t("Password")}
              value={value}
              onChangeText={onChange}
              isPassword
              icon="lock"
              placeholder="••••••••"
              error={error?.message}
            />
          )}
        />

<View style={{ marginTop: spacing.md }}>
          <Button label={t("Login")} onPress={submit} loading={loading} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
          <Text style={{ color: colors.textMuted }}>{t("New Sales Executive?")} </Text>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <Text style={{ color: colors.primary, fontWeight: "800" }}>{t("Register")}</Text>
          </Pressable>
        </View>
      </ScrollView>
      {/* Local AlertModal removed! */}
    </KeyboardAvoidingView>
  );
};