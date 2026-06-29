import React, { useState } from 'react';
import { View, Text, SectionList, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useShiftStore } from '../../../store/shiftStore';
import { Button } from '../../../design-system/components';

export const AttendanceReportScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const shiftHistory = useShiftStore((s) => s.shiftHistory);

  // Core State
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Date Selection State (Defaults to Today)
  const [startDate, setStartDate] = useState(new Date()); 
  const [endDate, setEndDate] = useState(new Date());

  // Date Normalization Helpers (strips time to 00:00:00 for accurate day comparison)
  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sDateNorm = normalizeDate(startDate).getTime();
  const eDateNorm = normalizeDate(endDate).getTime();
  const todayNorm = normalizeDate(new Date()).getTime();

  // --- CALENDAR LOGIC ---
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days: (Date | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const handleDayPress = (day: Date) => {
    const dayTime = day.getTime();
    
    // Prevent selecting future dates
    if (dayTime > todayNorm) return;

    if (sDateNorm === eDateNorm) {
      // Single day is currently selected
      if (dayTime > sDateNorm) {
        setEndDate(day); // Extend range forward
      } else if (dayTime < sDateNorm) {
        setEndDate(startDate); // Extend range backward
        setStartDate(day);
      }
    } else {
      // A range is currently selected, reset to a single day
      setStartDate(day);
      setEndDate(day);
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(year, month + offset, 1));
  };

  // --- TIMELINE LOGIC ---
  const displayShifts = shiftHistory.filter(s => {
    const shiftDate = normalizeDate(new Date(s.date)).getTime();
    return shiftDate >= sDateNorm && shiftDate <= eDateNorm;
  });

  const sections = displayShifts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(shift => ({
      title: new Date(shift.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      data: shift.events.sort((a, b) => a.time - b.time)
    }));

  const getIconForType = (type: string) => {
    switch(type) {
      case 'punch-in': return { name: 'login', color: '#16A34A', bg: '#DCFCE7' };
      case 'punch-out': return { name: 'logout', color: '#DC2626', bg: '#FEE2E2' };
      case 'expense': return { name: 'receipt', color: '#D97706', bg: '#FEF3C7' };
      default: return { name: 'assignment', color: '#2563EB', bg: '#DBEAFE' };
    }
  };

  const renderTimelineEvent = ({ item, index, dataLength }: any) => {
    const styling = getIconForType(item.type);
    const isLast = index === dataLength - 1;

    return (
      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        <View style={{ width: 65, alignItems: 'flex-end', paddingRight: spacing.md }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
            {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={{ alignItems: 'center', width: 24 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: styling.bg, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <MaterialIcons name={styling.name as any} size={14} color={styling.color} />
          </View>
          {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: -4, marginBottom: -20 }} />}
        </View>

        <View style={{ flex: 1, paddingLeft: spacing.md, paddingBottom: isLast ? 0 : spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{t(item.title)}</Text>
          {item.description ? (
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 4 }}>{t(item.description)}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  // --- RENDERERS ---
  const renderCalendarView = () => (
    <View style={{ flex: 1, padding: spacing.lg }}>
      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: spacing.md }}>
        {t("Select Date Range")}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl }}>
        {t("Tap a date to select it. Tap another date to create a range.")}
      </Text>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.soft, marginBottom: spacing.xl }}>
        {/* Month Navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Pressable onPress={() => changeMonth(-1)} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: radius.md }}>
            <MaterialIcons name="chevron-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
            {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => changeMonth(1)} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: radius.md }}>
            <MaterialIcons name="chevron-right" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Days of Week */}
        <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.textMuted }}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {days.map((day, i) => {
            if (!day) return <View key={i} style={{ width: '14.28%', aspectRatio: 1 }} />;

            const dayTime = day.getTime();
            const isStart = dayTime === sDateNorm;
            const isEnd = dayTime === eDateNorm;
            const isBetween = dayTime > sDateNorm && dayTime < eDateNorm;
            const isToday = dayTime === todayNorm;
            const isFuture = dayTime > todayNorm;

            let bgStyle: any = {};
            let textColor = isFuture ? '#CBD5E1' : colors.text;
            let textWeight: any = '600';

            if (isStart || isEnd) {
              bgStyle = { backgroundColor: colors.primary, borderRadius: radius.md };
              textColor = '#FFFFFF';
              textWeight = '900';
            } else if (isBetween) {
              bgStyle = { backgroundColor: colors.primarySoft };
              textColor = colors.primary;
              textWeight = '800';
            } else if (isToday) {
              bgStyle = { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md };
              textColor = colors.primary;
              textWeight = '800';
            }

            // Connect backgrounds seamlessly if a range is selected
            if (isStart && sDateNorm !== eDateNorm) {
              bgStyle = { ...bgStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 };
            }
            if (isEnd && sDateNorm !== eDateNorm) {
              bgStyle = { ...bgStyle, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 };
            }
            if (isBetween) {
              bgStyle = { ...bgStyle, borderRadius: 0 };
            }

            return (
              <Pressable key={i} onPress={() => handleDayPress(day)} disabled={isFuture} style={{ width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={[{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }, bgStyle]}>
                  <Text style={{ color: textColor, fontWeight: textWeight, fontSize: 14 }}>{day.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* CTA Button */}
      <View style={{ marginTop: 'auto', paddingBottom: spacing.xl }}>
        <Button 
          label={sDateNorm === eDateNorm ? t("Generate Timeline") : t("Generate Timeline for Range")}
          onPress={() => setViewMode('timeline')} 
          icon="timeline"
        />
      </View>
    </View>
  );

  const renderTimelineView = () => (
    <View style={{ flex: 1 }}>
      {/* Selection Info Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 2 }}>{t("Selected Range")}</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>
            {sDateNorm === eDateNorm ? startDate.toLocaleDateString() : `${startDate.toLocaleDateString()}  -  ${endDate.toLocaleDateString()}`}
          </Text>
        </View>
        <Pressable onPress={() => setViewMode('calendar')} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{t("Change")}</Text>
        </Pressable>
      </View>

      {/* Timeline List */}
      <View style={{ padding: spacing.lg, flex: 1 }}>
        {sections.length > 0 ? (
           <SectionList 
            sections={sections}
            keyExtractor={item => item.id}
            renderSectionHeader={({ section: { title } }) => (
              <View style={{ backgroundColor: '#F1F5F9', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.lg, marginTop: spacing.sm }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>{title}</Text>
              </View>
            )}
            renderItem={({ item, index, section }) => renderTimelineEvent({ item, index, dataLength: section.data.length })}
            showsVerticalScrollIndicator={false}
          />
        ) : (
           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.6 }}>
             <MaterialIcons name="event-busy" size={56} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
             <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMuted }}>{t("No records found")}</Text>
             <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6, fontWeight: '500', textAlign: 'center' }}>
               {t("No activities were logged during the selected time period.")}
             </Text>
           </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* Header */}
      <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => viewMode === 'timeline' ? setViewMode('calendar') : navigation.goBack()} style={{ padding: 8, marginRight: 8 }} hitSlop={15}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, flex: 1 }}>{t("Attendance Timeline")}</Text>
      </View>

      {/* Render Mode */}
      {viewMode === 'calendar' ? renderCalendarView() : renderTimelineView()}
    </View>
  );
};