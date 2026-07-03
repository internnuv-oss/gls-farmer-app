import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useShiftStore } from '../../../store/shiftStore';
import { PunchInModal } from './PunchInModal';
import { PunchOutModal } from './PunchOutModal';
import { useAlertStore } from '../../../store/alertStore';
import { useAuthStore } from '../../../store/authStore';
import { uploadFileToCloudinary } from '../../onboarding/services/cloudinaryService';

let lastOpenedLoginStamp: number | null = null;

export const ActiveShiftWidget = () => {
  const { t } = useTranslation();
  const { isActive, startTime, startShift, endShift, activitiesLogged, shiftHistory, transitMode } = useShiftStore();
  const loginTimestamp = useAuthStore((s) => s.loginTimestamp);

  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);

  // One shift per day: true only when a COMPLETED shift exists for today
  const hasPunchedToday = shiftHistory.some(shift => {
    const shiftDate = new Date(shift.date).toDateString();
    const today = new Date().toDateString();
    const hasCompletedShift = (shift as any).status === 'COMPLETED' ||
      shift.events.some(e => e.type === 'punch-out');
    return shiftDate === today && hasCompletedShift;
  });

  const handleShiftCompletedPress = () => {
    useAlertStore.getState().showAlert(
      t("Shift Already Completed"),
      t("You have already completed your shift for today. You can punch in again after 12:00 AM midnight."),
      [{ text: t("OK") }]
    );
  };

  useEffect(() => {
    // 🚀 THE FIX: Compare the stamp to ensure it opens ONCE per distinct login
    if (!isActive && loginTimestamp && loginTimestamp !== lastOpenedLoginStamp && !hasPunchedToday) {
      lastOpenedLoginStamp = loginTimestamp;
      setShowInModal(true);
    }
  }, [loginTimestamp, hasPunchedToday, isActive]);

  const initiatePunchOut = () => {
    // 🚀 THE WALL: Block if 0 activities AND they were travelling
    if (activitiesLogged === 0 && transitMode !== 'No Travelling') {
      useAlertStore.getState().showAlert(
        t("Cannot Punch Out"),
        t("You must log at least one activity (e.g. add a farmer) before closing your shift."),
        [{ text: t("OK") }]
      );
      return;
    }

    // If they have > 0 activities OR they selected 'No Travelling', let them open the modal!
    setShowOutModal(true);
  };

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current; // 🚀 NEW: Pulse animation state

  useEffect(() => {
    if (!isActive) {
      pulseAnim.setValue(1); // Reset pulse when not active
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -4, duration: 400, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ])
      ).start();
    } else {
      // 🚀 NEW: Start pulsing the green dot when active
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ])
      ).start();
    }
  }, [isActive, bounceAnim, pulseAnim]);

  return (
    <View style={{ width: '100%', alignItems: 'flex-end' }}>
      {isActive ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFCCB', paddingLeft: spacing.sm, paddingRight: 6, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: '#84CC16', ...shadows.soft, maxWidth: 190 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {/* 🚀 Changed to Animated.View and added transform scale */}
              <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#65A30D', transform: [{ scale: pulseAnim }] }} />
              <Text style={{ fontSize: 11, color: '#4D7C0F', fontWeight: '800', marginLeft: 3 }}>{t("ON DUTY")}</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#4D7C0F', fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
              {t("From")} {new Date(startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <Pressable onPress={initiatePunchOut} style={{ backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, flexShrink: 0 }}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>{t("Punch Out")}</Text>
          </Pressable>
        </View>
      ) : (
        // One shift per day: show tappable badge that explains the restriction
        hasPunchedToday ? (
          <Pressable
            onPress={handleShiftCompletedPress}
            style={{ backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <MaterialIcons name="lock-clock" size={14} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800' }}>{t("SHIFT COMPLETED")}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setShowInModal(true)}
            style={{ backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: 4, ...shadows.soft, flexShrink: 0 }}
          >
            {/* 4. Apply the animation here */}
            <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
              <MaterialIcons name="touch-app" size={16} color="white" />
            </Animated.View>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>{t("Punch In")}</Text>
          </Pressable>
        )
      )}

      <PunchInModal
        visible={showInModal}
        onClose={() => setShowInModal(false)}
        onConfirm={async (isPers: boolean, km: string, mode: string, odoImg?: string, metadata?: any) => {
          const odoUrl = odoImg ? await uploadFileToCloudinary(odoImg, 'image') : null;
          await startShift(
            isPers, km, mode,
            metadata?.vehicleType || null,
            metadata?.actualTime || Date.now(),
            metadata?.editedTime || null,
            metadata?.location || null,
            odoUrl, // Pass the Cloudinary URL
            metadata?.routeId || null
          );
          setShowInModal(false);
        }}
      />

      <PunchOutModal
        visible={showOutModal}
        onClose={() => setShowOutModal(false)}
        onConfirm={async (endKm: string, odoImg?: string, metadata?: any) => {
          const odoUrl = odoImg ? await uploadFileToCloudinary(odoImg, 'image') : null;
          await endShift(
            endKm,
            metadata?.actualTime || Date.now(),
            metadata?.editedTime || null,
            metadata?.location || null,
            odoUrl,
            metadata?.comment // 🚀 Pass the comment payload up to the store
          );
          setShowOutModal(false);

          useAlertStore.getState().showAlert(
            t("Shift Ended"),
            t("Your daily attendance and journey parameters have been compiled successfully."),
            [{ text: t("OK") }]
          );
        }}
      />
    </View>
  );
};