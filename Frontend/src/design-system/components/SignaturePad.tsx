import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../tokens';

type Point = { x: number; y: number };

const toPath = (points: Point[]) => {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(' ');
};

type Props = { 
  height?: number; 
  value?: string; // <-- ADDED: Accept the value prop
  onChange?: (hasSignature: boolean, signatureData?: string) => void; 
};

export const SignaturePad: React.FC<Props> = ({ height = 250, value, onChange }) => { // <-- ADDED: Destructure value
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [liveStroke, setLiveStroke] = useState<Point[] | null>(null);
  const current = useRef<Point[]>([]);
  const rafRef = useRef<number | null>(null);

  // <-- ADDED: Automatically load the saved signature strokes when opening a draft
  useEffect(() => {
    if (value && strokes.length === 0) {
      try {
        const savedStrokes = JSON.parse(value);
        setStrokes(savedStrokes);
      } catch (e) {
        console.error("Failed to parse signature data", e);
      }
    }
  }, [value]);

  // Prevent infinite loops by tracking onChange in a ref
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // SAFELY trigger react-hook-form updates outside of the render cycle
  useEffect(() => {
    if (strokes.length > 0) {
      onChangeRef.current?.(true, JSON.stringify(strokes));
    } else {
      onChangeRef.current?.(false, '');
    }
  }, [strokes]);

  const clear = useCallback(() => {
    setStrokes([]); 
    setLiveStroke(null); 
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      current.current = [{ x: locationX, y: locationY }];
      setLiveStroke([{ x: locationX, y: locationY }]);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      current.current = [...current.current, { x: locationX, y: locationY }];
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setLiveStroke([...current.current]);
        });
      }
    },
    onPanResponderRelease: () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      const points = current.current;
      current.current = []; 
      setLiveStroke(null);
      if (points.length > 1) {
        // PURE state update - no side effects inside this!
        setStrokes((s) => [...s, points]);
      }
    },
  }), []);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>Draw Signature</Text>
        <Pressable onPress={clear} style={{ padding: 4 }}>
          <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
      <View style={{ height, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: '#F8FAFC', overflow: 'hidden' }} {...panResponder.panHandlers}>
        {strokes.length === 0 && !liveStroke && (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="draw" size={48} color={colors.border} />
            <Text style={{ color: colors.textMuted, marginTop: 8, fontWeight: '600' }}>Sign within the box</Text>
          </View>
        )}
        <Svg width="100%" height="100%">
          {strokes.map((points, idx) => <Path key={idx} d={toPath(points)} stroke={colors.primary} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
          {liveStroke && liveStroke.length > 1 && <Path d={toPath(liveStroke)} stroke={colors.primary} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </Svg>
      </View>
    </View>
  );
};