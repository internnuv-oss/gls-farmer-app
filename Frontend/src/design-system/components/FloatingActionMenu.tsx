import React, { useState, useRef } from 'react';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, radius, shadows, spacing } from '../tokens';

type Action = { id: string; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; };
type Props = { actions: Action[]; onActionPress: (id: string) => void; };

export const FloatingActionMenu: React.FC<Props> = ({ actions, onActionPress }) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    if (isOpen) {
      Animated.timing(animation, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setIsOpen(false));
    } else {
      setIsOpen(true);
      Animated.spring(animation, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    }
  };

  const menuOpacity = animation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const menuTranslateY = animation.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const fabRotation = animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });

  return (
    <>
      {/* FIXED: Removed the negative height/width margins. 
        StyleSheet.absoluteFill automatically stretches the view to cover the whole screen.
        Added elevation: 10 so it overlays other Android elements properly.
      */}
      {isOpen && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 10, elevation: 10, opacity: menuOpacity }]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <Pressable style={{ flex: 1 }} onPress={toggleMenu} />
          </BlurView>
        </Animated.View>
      )}

      <View style={styles.container}>
        {isOpen && (
          <Animated.View style={[styles.actionsContainer, { opacity: menuOpacity, transform: [{ translateY: menuTranslateY }] }]}>
            {actions.map((action) => (
              <Pressable
                key={action.id} style={styles.actionItem}
                onPress={() => { toggleMenu(); onActionPress(action.id); }}
              >
                <Text style={styles.actionLabel}>{action.label}</Text>
                <View style={styles.actionIcon}>
                  <MaterialIcons name={action.icon} size={22} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}
        <Pressable onPress={toggleMenu}>
          <Animated.View style={[styles.fab, { transform: [{ rotate: fabRotation }] }]}>
            <MaterialIcons name="add" size={32} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  // Added elevation 20 to ensure it always floats above the blur overlay
  container: { position: 'absolute', bottom: spacing.xl, right: spacing.lg, alignItems: 'flex-end', zIndex: 20, elevation: 20 },
  actionsContainer: { marginBottom: spacing.sm, alignItems: 'flex-end' },
  actionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  actionLabel: { backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginRight: spacing.sm, fontWeight: '700', overflow: 'hidden', ...shadows.soft },
  actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', ...shadows.soft },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.medium },
});