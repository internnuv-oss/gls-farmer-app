import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react-native";
import { Controller } from "react-hook-form";
import { useRegisterForm } from "../hooks";
import { Input } from "../../../design-system/components/Input";
import { Button } from "../../../design-system/components/Button";
import { AlertModal } from "../../../design-system/components/AlertModal";
import { colors, spacing } from "../../../design-system/tokens";

export const RegisterScreen = ({ navigation }: any) => {
  const { t } = useTranslation();

  const [modal, setModal] = useState({
    visible: false,
    title: "",
    message: "",
    tone: "danger" as any,
    isSuccess: false,
  });

  const { form, submit, loading } = useRegisterForm(
    (msg) =>
      setModal({
        visible: true,
        title: t("Success"),
        message: msg,
        tone: "success",
        isSuccess: true,
      }),
    (err) =>
      setModal({
        visible: true,
        title: t("Registration Failed"),
        message: err,
        tone: "danger",
        isSuccess: false,
      }),
  );

  const handleModalClose = () => {
    setModal({ ...modal, visible: false });
    if (modal.isSuccess) {
      navigation.navigate("Login");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing["2xl"],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: "#E8F5E9",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.md,
            }}
          >
            <UserPlus size={32} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text }}>
            {t("Create Account")}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              marginTop: 8,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            {t("Join as a Sales Executive")}
          </Text>
        </View>

        <Controller
          control={form.control}
          name="name"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label={t("Full Name")}
              value={value}
              onChangeText={onChange}
              icon="person"
              placeholder="e.g. Ramesh Patel"
              error={error?.message}
            />
          )}
        />

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

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label={t("Confirm Password")}
              value={value}
              onChangeText={onChange}
              isPassword
              icon="lock-outline"
              placeholder="••••••••"
              error={error?.message}
            />
          )}
        />

        <View style={{ marginTop: spacing.md }}>
          <Button label={t("Register")} onPress={submit} loading={loading} />
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: spacing.xl,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            {t("Already have an account?")}{" "}
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={{ marginLeft: 4 }}
          >
            <Text
              style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}
            >
              {t("Login")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <AlertModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        tone={modal.tone}
        actionLabel={modal.isSuccess ? t("Go to Login") : t("Try Again")}
        onClose={handleModalClose}
      />
    </KeyboardAvoidingView>
  );
};
