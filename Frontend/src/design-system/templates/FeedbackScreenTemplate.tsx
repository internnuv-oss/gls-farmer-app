import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { colors, spacing, typography } from '../tokens';

type FeedbackTone = 'primary' | 'danger' | 'warning' | 'info' | 'success';
type AnimationType = 'spin' | 'float' | 'pulse' | 'none';

type Props = {
  title: string;
  description: string;
  iconName: React.ComponentProps<typeof MaterialIcons>['name'];
  tone?: FeedbackTone;
  animationType?: AnimationType;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionVariant?: 'button' | 'text'; // NEW
  primaryActionIcon?: React.ComponentProps<typeof MaterialIcons>['name']; // NEW
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionIcon?: React.ComponentProps<typeof MaterialIcons>['name']; // NEW
  tertiaryActionLabel?: string;
  onTertiaryAction?: () => void;
  tertiaryActionIcon?: React.ComponentProps<typeof MaterialIcons>['name']; // NEW
};

export const FeedbackScreenTemplate: React.FC<Props> = ({
  title, description, iconName, tone = 'primary', animationType = 'none',
  primaryActionLabel, onPrimaryAction, primaryActionVariant = 'button', primaryActionIcon,
  secondaryActionLabel, onSecondaryAction, secondaryActionIcon,
  tertiaryActionLabel, onTertiaryAction, tertiaryActionIcon
}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    if (animationType === 'spin') {
      Animated.loop(
        Animated.timing(animValue, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else if (animationType === 'float') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    } else if (animationType === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    }
  }, [animationType]);

  const getAnimationTransform = () => {
    switch (animationType) {
      case 'spin':
        return [{ rotate: animValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }];
      case 'float':
        return [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }];
      case 'pulse':
        return [{ scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }];
      default:
        return [];
    }
  };

  const toneConfig = {
    primary: { color: colors.primary, bg: colors.primarySoft },
    danger: { color: colors.danger, bg: '#FEE2E2' },
    warning: { color: colors.warning, bg: '#FEF3C7' },
    info: { color: colors.info, bg: '#DBEAFE' },
    success: { color: colors.success, bg: '#DCFCE7' },
  }[tone];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrapper, { backgroundColor: toneConfig.bg, transform: getAnimationTransform() }]}>
          <MaterialIcons name={iconName} size={48} color={toneConfig.color} />
        </Animated.View>
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.footer}>
        {/* Updated Primary Action */}
        {primaryActionVariant === 'text' ? (
          <Pressable onPress={onPrimaryAction} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.md, marginBottom: spacing.md }}>
            {primaryActionIcon && <MaterialIcons name={primaryActionIcon} size={20} color={colors.primary} style={{ marginRight: 8 }} />}
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>{primaryActionLabel}</Text>
          </Pressable>
        ) : (
          <Button label={primaryActionLabel} onPress={onPrimaryAction} variant={tone === 'danger' ? 'danger' : 'primary'} icon={primaryActionIcon} />
        )}
        
        {secondaryActionLabel && onSecondaryAction && (
          <View style={{ marginTop: spacing.md }}>
            <Button label={secondaryActionLabel} onPress={onSecondaryAction} variant="secondary" icon={secondaryActionIcon} />
          </View>
        )}

        {tertiaryActionLabel && onTertiaryAction && (
          <View style={{ marginTop: spacing.md }}>
            <Button label={tertiaryActionLabel} onPress={onTertiaryAction} variant="secondary" icon={tertiaryActionIcon} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screen, padding: spacing['2xl'] },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrapper: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: spacing['2xl'] },
  title: { ...typography.headingLg, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  description: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 24, paddingHorizontal: spacing.md },
  footer: { paddingBottom: spacing.xl }
});