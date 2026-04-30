import React, { useEffect, useRef } from 'react';
import { ScrollView, View, Text, Pressable, KeyboardAvoidingView, Platform, RefreshControl, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows, radius } from '../tokens';

const TOP_PADDING = 24;

// ==========================================
// 1. SIMPLE SCREEN TEMPLATE
// ==========================================
type SimpleProps = {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollViewRef?: React.RefObject<ScrollView>;
  noScroll?: boolean;
};

export const SimpleScreenTemplate: React.FC<SimpleProps> = ({ 
  title, onBack, rightAction, children, footer, refreshing = false, onRefresh, scrollViewRef, noScroll 
}) => {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, TOP_PADDING);
  
  // 🚀 Internal fallback ref if none provided
  const internalRef = useRef<ScrollView>(null);
  const activeRef = scrollViewRef || internalRef;

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      
      {/* --- FOOLPROOF 3-COLUMN HEADER --- */}
      <View style={{ paddingTop: paddingTop + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
        
        {/* LEFT COLUMN (Fixed width, elevated) */}
        <View style={{ width: 50, alignItems: 'flex-start', zIndex: 20, elevation: 10 }}>
          {onBack && (
            <Pressable 
              onPress={onBack} 
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <MaterialIcons name="chevron-left" size={32} color={colors.text} />
            </Pressable>
          )}
        </View>

        {/* CENTER COLUMN (Flex space) */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.headingMd, { textAlign: 'center' }]} numberOfLines={1}>{title}</Text>
        </View>

        {/* RIGHT COLUMN (Fixed width, elevated) */}
        <View style={{ width: 50, alignItems: 'flex-end', zIndex: 20, elevation: 10 }}>
          {rightAction}
        </View>

      </View>

      {noScroll ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: footer ? 140 : 0 }}>
          {children}
        </View>
      ) : (
        <ScrollView
          ref={activeRef as any}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: footer ? 140 : spacing['2xl'] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} /> : undefined}
        >
          {children}
        </ScrollView>
      )}

      {footer && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.soft }}>
          {footer}
        </View>
      )}
    </View>
  );
};

// ==========================================
// 2. FORM SCREEN TEMPLATE
// ==========================================
type FormProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const FormScreenTemplate: React.FC<FormProps> = ({ title, description, children, footer }) => {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, TOP_PADDING);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.screen }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: paddingTop + 32, paddingBottom: footer ? 140 : spacing['2xl'] }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[typography.headingXl, { textAlign: 'center', marginBottom: spacing.sm, color: colors.text }]}>{title}</Text>
        {description && <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl }}>{description}</Text>}
        {children}
      </ScrollView>
      {footer && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.soft }}>
          <View style={{ gap: spacing.sm }}>{footer}</View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// ==========================================
// 3. WIZARD FLOW TEMPLATE (For Onboarding)
// ==========================================
type WizardProps = {
  headerTitle: string;
  stepLabel?: string;
  stepTextRight?: string;
  progress01?: number;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
};

export const WizardFlowTemplate: React.FC<WizardProps> = ({ headerTitle, stepLabel, stepTextRight, progress01 = 0, onBack, children, footer, headerRight }) => {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, TOP_PADDING);
  
  // 🚀 Ref for the ScrollView
  const scrollRef = useRef<ScrollView>(null);

  // 🚀 Automatically scroll to top whenever the step (progress01) changes
  useEffect(() => {
    // A. Instantly kill the keyboard so it doesn't animate the KeyboardAvoidingView
    Keyboard.dismiss(); 

    // B. Wait exactly 10ms for the new step's UI to draw, THEN jump instantly
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 10);

    return () => clearTimeout(timeout);
  }, [progress01]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.screen }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        
        {/* --- FOOLPROOF 3-COLUMN HEADER --- */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          
          {/* LEFT COLUMN */}
          <View style={{ width: 50, alignItems: 'flex-start', zIndex: 20, elevation: 10 }}>
            {onBack && (
              <Pressable onPress={onBack} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <MaterialIcons name="chevron-left" size={32} color={colors.text} />
              </Pressable>
            )}
          </View>

          {/* CENTER COLUMN */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[typography.headingMd, { textAlign: 'center' }]} numberOfLines={1}>{headerTitle}</Text>
          </View>

          {/* RIGHT COLUMN */}
          <View style={{ width: 50, alignItems: 'flex-end', zIndex: 20, elevation: 10 }}>
            {headerRight}
          </View>

        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          {stepLabel && <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>{stepLabel}</Text>}
          {stepTextRight && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{stepTextRight}</Text>}
        </View>
        <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ width: `${Math.max(0, Math.min(1, progress01)) * 100}%`, backgroundColor: colors.primary, height: 4 }} />
        </View>
      </View>

      <ScrollView 
        ref={scrollRef} // 🚀 Attached ref here
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 350 }}
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {footer && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.soft }}>
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// ==========================================
// 4. DASHBOARD SCREEN TEMPLATE
// ==========================================
type DashboardProps = {
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  periodSelector?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export const DashboardScreenTemplate: React.FC<DashboardProps> = ({ headerLeft, headerRight, periodSelector, children, refreshing = false, onRefresh }) => {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, spacing.xl);

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ paddingTop: paddingTop + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>{headerLeft}</View>
        <View style={{ zIndex: 10, elevation: 10 }}>{headerRight}</View>
      </View>
      {periodSelector && <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>{periodSelector}</View>}
      
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
};