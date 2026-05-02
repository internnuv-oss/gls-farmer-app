import React, { useMemo } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react-native";
import { Controller } from "react-hook-form";

import { useRegisterForm } from "../hooks";
import { Input, Button, DatePickerField } from "../../../design-system/components";
import { colors, spacing } from "../../../design-system/tokens";
import { useAlertStore } from "../../../store/alertStore"; // ✅ Use global alert

export const RegisterScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const showAlert = useAlertStore((state) => state.showAlert);

  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d; 
  }, []);

  const { form, submit, loading } = useRegisterForm(
    (msg) => {
      // ✅ Trigger global alert. It will persist during navigation to Dashboard.
      showAlert(
        t("Success"), 
        t("Account created successfully! Welcome to Field Commander."), 
        [{ text: t("Let's Start"), style: "default" }]
      );
    },
    (err) => {
      showAlert(t("Registration Failed"), err, [{ text: t("Try Again"), style: "destructive" }]);
    }
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing["2xl"], paddingTop: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
            <Leaf size={32} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text }}>{t("Create Account")}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 15 }}>{t("Join as a Sales Executive")}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Controller control={form.control} name="firstName" render={({ field }) => (
              <Input label={t("First Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Ramesh")} error={form.formState.errors.firstName?.message} />
            )} />
          </View>
          <View style={{ flex: 1 }}>
            <Controller control={form.control} name="lastName" render={({ field }) => (
              <Input label={t("Last Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Patel")} error={form.formState.errors.lastName?.message} />
            )} />
          </View>
        </View>

        <Controller control={form.control} name="dob" render={({ field }) => (
          <DatePickerField label={t("Date of Birth (18+ only) *")} value={field.value} onChange={field.onChange} maximumDate={maxDobDate} error={form.formState.errors.dob?.message} />
        )} />

        <Controller control={form.control} name="email" render={({ field }) => (
          <Input label={t("Email ID *")} value={field.value} onChangeText={(val) => field.onChange(val.toLowerCase())} keyboardType="email-address" autoCapitalize="none" placeholder={t("e.g. ramesh@gls.com")} icon="email" error={form.formState.errors.email?.message} />
        )} />

        <Controller control={form.control} name="mobile" render={({ field }) => (
          <Input label={t("Mobile Number *")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" prefix="+91" maxLength={10} icon="phone" placeholder="98765 43210" error={form.formState.errors.mobile?.message} />
        )} />

        <Controller control={form.control} name="password" render={({ field }) => (
          <Input label={t("Password *")} value={field.value} onChangeText={field.onChange} isPassword icon="lock" placeholder="••••••••" error={form.formState.errors.password?.message} />
        )} />

        <Controller control={form.control} name="confirmPassword" render={({ field }) => (
          <Input label={t("Confirm Password *")} value={field.value} onChangeText={field.onChange} isPassword icon="lock-outline" placeholder="••••••••" error={form.formState.errors.confirmPassword?.message} />
        )} />

        <View style={{ marginTop: spacing.md }}>
          <Button label={t("Register")} onPress={submit} loading={loading} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, marginBottom: 40 }}>
          <Text style={{ color: colors.textMuted }}>{t("Already have an account?")} </Text>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text style={{ color: colors.primary, fontWeight: "800" }}>{t("Login")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};