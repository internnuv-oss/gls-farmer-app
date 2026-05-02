import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Animated } from 'react-native';
import { 
  useAudioRecorder, 
  AudioModule, 
  RecordingPresets, 
  useAudioRecorderState, 
  useAudioPlayer, 
  useAudioPlayerStatus 
} from 'expo-audio';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius } from '../tokens';

type Props = {
  value?: string;
  loading?: boolean;
  onRecord: (uri: string) => void;
  onClear: () => void;
};

export const AudioRecorder: React.FC<Props> = ({ value, loading, onRecord, onClear }) => {
  const audioRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const audioSource = React.useMemo(() => {
    if (!value) return null;
    return value.startsWith('http') ? { uri: value } : value;
  }, [value]);
  
  const player = useAudioPlayer(audioSource);
  const playerStatus = useAudioPlayerStatus(player);

  // Local state for recording timer & animation
  const [recordTime, setRecordTime] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Handle Timer & Pulse Animation during recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recorderState.isRecording) {
      interval = setInterval(() => setRecordTime(prev => prev + 1), 1000);
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      setRecordTime(0);
      pulseAnim.setValue(1);
      Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }).stop();
    }
    return () => clearInterval(interval);
  }, [recorderState.isRecording, pulseAnim]);

  // Utility to format seconds into M:SS
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  async function startRecording() {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Microphone access is required to record audio.');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        onRecord(audioRecorder.uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  async function togglePlayback() {
    if (!player) return;
    
    if (playerStatus.playing) {
      player.pause();
    } else {
      // Reset to beginning if playback already finished
      if (playerStatus.currentTime >= playerStatus.duration - 0.1 && playerStatus.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  }

  if (loading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ marginLeft: 8, color: colors.textMuted, fontWeight: '600' }}>Uploading audio...</Text>
      </View>
    );
  }

  // --- PLAYBACK UI ---
  if (value) {
    // NEW expo-audio natively provides time in seconds, so we don't divide by 1000 anymore.
    const durationSec = playerStatus.duration || 0;
    const currentSec = playerStatus.currentTime || 0;
    const progressPct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 8, borderRadius: radius.md }}>
        <Pressable onPress={togglePlayback} style={{ padding: 8, backgroundColor: '#FFF', borderRadius: 20 }}>
          <MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={20} color={colors.primary} />
        </Pressable>
        
        {/* Progress Bar & Timers */}
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>Voice Note</Text>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {formatTime(currentSec)} / {formatTime(durationSec)}
            </Text>
          </View>
          
          <View style={{ height: 4, backgroundColor: '#BBF7D0', borderRadius: 2, width: '100%', overflow: 'hidden' }}>
            <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 2 }} />
          </View>
        </View>

        <Pressable onPress={() => { player?.pause(); onClear(); }} style={{ padding: 8 }}>
          <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
    );
  }

  // --- RECORDING UI ---
  return (
    <Pressable
      onPress={recorderState.isRecording ? stopRecording : startRecording}
      style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: recorderState.isRecording ? colors.danger : colors.border, borderRadius: radius.md, backgroundColor: recorderState.isRecording ? '#FEE2E2' : colors.surface }}
    >
      {recorderState.isRecording ? (
        <View style={{ width: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger }} />
        </View>
      ) : (
        <MaterialIcons name="mic" size={20} color={colors.textMuted} />
      )}
      
      <Text style={{ flex: 1, marginLeft: 8, color: recorderState.isRecording ? colors.danger : colors.textMuted, fontWeight: '600' }}>
        {recorderState.isRecording ? "Recording... Tap to stop" : "Tap to record a voice note"}
      </Text>
      
      {recorderState.isRecording && (
        <Text style={{ color: colors.danger, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {formatTime(recordTime)}
        </Text>
      )}
    </Pressable>
  );
};