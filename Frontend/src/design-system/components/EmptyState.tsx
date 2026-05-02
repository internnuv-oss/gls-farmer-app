import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, spacing, typography } from '../tokens';

type Props = {
  title: string;
  description: string;
  iconName: React.ComponentProps<typeof MaterialIcons>['name'];
  actionLabel: string;
  actionIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
  onAction: () => void;
};

export const EmptyState: React.FC<Props> = ({ title, description, iconName, actionLabel, actionIcon, onAction }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, [animValue]);

  const translateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrapper, { transform: [{ translateY }] }]}>
        <MaterialIcons name={iconName} size={48} color={colors.primary} />
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={{ marginTop: spacing.xl, width: '100%', maxWidth: 220 }}>
      <Button 
  label={actionLabel} 
  onPress={onAction} 
  variant="secondary"
  icon={actionIcon}
  iconPosition="left"
/>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: spacing.xl, 
    marginTop: spacing['3xl'] 
  },
  iconWrapper: { 
    width: 96, 
    height: 96, 
    borderRadius: 48, 
    backgroundColor: colors.primarySoft, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: spacing.lg 
  },
  title: { 
    ...typography.headingMd, 
    color: colors.text, 
    marginBottom: spacing.xs, 
    textAlign: 'center' 
  },
  description: { 
    ...typography.bodyMd, 
    color: colors.textMuted, 
    textAlign: 'center', 
    paddingHorizontal: spacing.md,
    lineHeight: 22
  }
});