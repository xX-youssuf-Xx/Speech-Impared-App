import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, Alert, Switch, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import ServerUrlOverlay from '../components/ServerUrlOverlay';
import { useServerUrl } from '../context/ServerUrlContext';
import Toast from 'react-native-toast-message';
// Add this import for file system access
import RNFS from 'react-native-fs';

import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';

const audioRecorderPlayer = new AudioRecorderPlayer();

// Custom Waveform Component
const CustomWaveform = ({ data }) => {
  return (
    <View style={styles.waveformContainer}>
      {data.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveformBar,
            { 
              height: height * 100,
              opacity: height * 0.8 + 0.2 // Add some minimum opacity
            }
          ]}
        />
      ))}
    </View>
  );
};

const TranscribingScreen = () => {
  const { serverUrl, loading: serverUrlLoading } = useServerUrl();

  const [isRecordingPress, setIsRecordingPress] = useState(false);
  const [isRecordingHold, setIsRecordingHold] = useState(false);
  const [recordedFilePath, setRecordedFilePath] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [speakTranscribedText, setSpeakTranscribedText] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformData, setWaveformData] = useState(Array(20).fill(0.1));
  const [lastTtsUrl, setLastTtsUrl] = useState(null);
  const recordingStartTimeRef = useRef(0);
  const recordingTimerRef = useRef(null);

  // Create refs for immediate state access in handlers
  const isRecordingPressRef = useRef(isRecordingPress);
  const isRecordingHoldRef = useRef(isRecordingHold);
  const recordedFilePathRef = useRef(recordedFilePath);
  const recordingDurationRef = useRef(0);

  // Add a ref to track if recording is in progress
  const isRecordingInProgressRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingPressRef.current = isRecordingPress;
    console.log('isRecordingPress state updated to:', isRecordingPress);
  }, [isRecordingPress]);

  useEffect(() => {
    isRecordingHoldRef.current = isRecordingHold;
    console.log('isRecordingHold state updated to:', isRecordingHold);
  }, [isRecordingHold]);

  useEffect(() => {
    recordedFilePathRef.current = recordedFilePath;
    console.log('recordedFilePath state updated to:', recordedFilePath);
  }, [recordedFilePath]);

  // Request permissions on component mount
  useEffect(() => {
    requestAudioPermissions();

    return () => {
      // Stop playback and recording when the component unmounts
      if (isRecordingInProgressRef.current) {
        audioRecorderPlayer.stopRecorder();
      }
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.removePlayBackListener();
      cleanupRecording();
    };
  }, []);

  const requestAudioPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        if (
          grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('RECORD_AUDIO permission granted');
          setHasAudioPermission(true);
        } else {
          console.log('RECORD_AUDIO permission denied');
          setHasAudioPermission(false);
        }
      } catch (err) {
        console.warn(err);
        setHasAudioPermission(false);
      }
    } else {
      setHasAudioPermission(true);
    }
  };

  // Helper function to get a writable file path
  const getRecordingPath = () => {
    const timestamp = Date.now();
    return `${RNFS.DocumentDirectoryPath}/recording_${timestamp}.wav`;
  };

  // Cleanup function
  const cleanupRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioRecorderPlayer.removeRecordBackListener();
    setRecordingDuration(0);
    recordingStartTimeRef.current = 0;
    setWaveformData(Array(20).fill(0.1));
    isRecordingInProgressRef.current = false;
  };

  const startRecording = async (mode) => {
    console.log(`startRecording called with mode: ${mode}`, {
      serverUrl: !!serverUrl,
      hasAudioPermission,
      isRecordingPress: isRecordingPressRef.current,
      isRecordingHold: isRecordingHoldRef.current,
      isRecordingInProgress: isRecordingInProgressRef.current
    });

    if (!serverUrl) {
      console.log('startRecording: Server URL not set, returning.');
      Toast.show({
        type: 'error',
        text1: 'Server URL not set',
        text2: 'Please set the server URL in Settings to record.',
      });
      return;
    }

    if (!hasAudioPermission) {
      console.log('startRecording: Audio permission denied, returning.');
      Toast.show({
        type: 'error',
        text1: 'Permission denied',
        text2: 'Audio recording permission is required.',
      });
      return;
    }

    // Check if recording is already in progress
    if (isRecordingInProgressRef.current) {
      console.log('startRecording: Recording already in progress, ignoring start request.');
      return;
    }

    // Prevent starting if already recording in any mode using refs for immediate check
    if (isRecordingPressRef.current || isRecordingHoldRef.current) {
      console.log('startRecording: Already recording, ignoring start request.');
      return;
    }

    const audioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
      AVLinearPCMBitRateKey: 128000,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsFloatKey: false,
      AVNumberOfChannelsKey: 1,
      AVSampleRateKey: 16000,
      OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
      // Add WAV specific settings
      AudioFormatAndroid: 'wav',
      AudioEncodingBitRateAndroid: 128000,
      AudioChannelsAndroid: 1,
      AudioSamplingRateAndroid: 16000,
    };

    const uri = getRecordingPath();

    try {
      console.log('Attempting to start recording to URI:', uri);
      console.log('Audio settings:', audioSet);
      
      // Set recording in progress before starting
      isRecordingInProgressRef.current = true;
      
      const result = await audioRecorderPlayer.startRecorder(uri, audioSet);
      console.log('Recording started successfully:', result);
      
      // Reset and start recording duration timer
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      recordingStartTimeRef.current = Date.now();

      // Start precise 1-second interval timer
      recordingTimerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsedSeconds);
      }, 1000);

      // Add record back listener for metering only
      audioRecorderPlayer.addRecordBackListener((e) => {
        // Update waveform based on metering level
        if (e.metering) {
          // Convert dB to a value between 0 and 1
          const normalizedLevel = Math.min(Math.max((e.metering + 60) / 60, 0), 1);
          setWaveformData(prevData => {
            const newData = [...prevData];
            // Shift all values to the left
            newData.shift();
            // Add new value at the end
            newData.push(normalizedLevel);
            return newData;
          });
        }
      });
      
      // Set state immediately after successful start
      if (mode === 'press') {
        setIsRecordingPress(true);
        console.log('setIsRecordingPress set to true after successful start');
      } else if (mode === 'hold') {
        setIsRecordingHold(true);
        console.log('setIsRecordingHold set to true after successful start');
      }
      
      // Clear previous data when starting new recording
      setRecordedFilePath(null);
      setTranscribedText('');
      setTtsAudioUrl(null);
      
      Toast.show({
        type: 'success',
        text1: 'Recording started',
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      console.error('Error details:', error.message, error.code);
      // Reset recording state on error
      isRecordingInProgressRef.current = false;
      cleanupRecording();
      Toast.show({
        type: 'error',
        text1: 'Recording failed',
        text2: error.message || 'Could not start recording.',
      });
    }
  };

  const stopRecording = async (mode) => {
    console.log(`stopRecording called with mode: ${mode}`, { 
      isRecordingPress, 
      isRecordingHold, 
      isRecordingPressRef: isRecordingPressRef.current, 
      isRecordingHoldRef: isRecordingHoldRef.current,
      isRecordingInProgress: isRecordingInProgressRef.current
    });

    // Only stop if actually recording in the specified mode using refs
    if ((mode === 'press' && !isRecordingPressRef.current) || 
        (mode === 'hold' && !isRecordingHoldRef.current) ||
        !isRecordingInProgressRef.current) {
      console.log(`stopRecording: Not currently recording in ${mode} mode based on ref, ignoring stop request.`);
      return;
    }

    try {
      console.log('Attempting to stop recording...');
      // Remove record back listener before stopping
      audioRecorderPlayer.removeRecordBackListener();
      const result = await audioRecorderPlayer.stopRecorder();
      console.log('Recording stopped successfully:', result);
      
      // Clear recording timer and waveform updates
      cleanupRecording();
      
      // Set state *after* successful stop
      setRecordedFilePath(result);
      console.log('recordedFilePath set to:', result);

      if (mode === 'press') {
        setIsRecordingPress(false);
        console.log('setIsRecordingPress set to false after successful stop');
      } else if (mode === 'hold') {
        setIsRecordingHold(false);
        console.log('setIsRecordingHold set to false after successful stop');
        // For hold mode: stop and immediately send for transcription
        if (result) {
          console.log('Hold mode: Sending recording for transcription immediately');
          sendForTranscription(result);
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Recording stopped',
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      // Reset recording state on error
      cleanupRecording();
      if (mode === 'press') {
        setIsRecordingPress(false);
      } else if (mode === 'hold') {
        setIsRecordingHold(false);
      }
      Toast.show({
        type: 'error',
        text1: 'Stop recording failed',
        text2: 'Could not stop recording.',
      });
    }
  };

  const playRecording = async () => {
    if (!recordedFilePath) {
      Toast.show({
        type: 'info',
        text1: 'No recording available',
      });
      return;
    }
    
    if (isPlaying) {
       await audioRecorderPlayer.stopPlayer();
       audioRecorderPlayer.removePlayBackListener();
       setIsPlaying(false);
       Toast.show({
         type: 'info',
         text1: 'Playback stopped'
       });
       return;
    }

    console.log('Playing recording:', recordedFilePath);
    setIsPlaying(true);
    try {
      await audioRecorderPlayer.startPlayer(recordedFilePath);
      audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition === e.duration) {
          console.log('Playback finished');
          audioRecorderPlayer.stopPlayer();
          audioRecorderPlayer.removePlayBackListener();
          setIsPlaying(false);
        }
      });
      Toast.show({
         type: 'success',
         text1: 'Playing recording'
       });
    } catch (error) {
       console.error('Error playing recording:', error);
       Toast.show({
         type: 'error',
         text1: 'Playback Failed',
         text2: 'Could not play recording.'
       });
       setIsPlaying(false);
    }
  };

  const handleReplayTTS = async () => {
    if (!lastTtsUrl) {
      Toast.show({
        type: 'error',
        text1: 'No TTS Audio Available',
        text2: 'Generate transcription with TTS first.',
      });
      return;
    }
    await playTtsAudio(lastTtsUrl);
  };

  const sendForTranscription = async (filePath) => {
    if (!serverUrl) {
      Toast.show({
        type: 'error',
        text1: 'Server URL not set',
        text2: 'Please set the server URL in Settings.',
      });
      return;
    }
    if (!filePath) {
      Toast.show({
        type: 'info',
        text1: 'No audio to transcribe',
      });
      return;
    }

    setIsProcessing(true);
    setTranscribedText('');
    setTtsAudioUrl(null);
    console.log('Sending for transcription...', filePath);

    try {
      // Create form data with exact key 'file' as expected by server
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        name: 'file.wav',
        type: 'audio/wav'
      });

      // Ensure server URL has port 8000
      const serverUrlWithPort = serverUrl.includes(':8000') ? serverUrl : `${serverUrl.replace(/\/$/, '')}:8000/`;
      const requestUrl = `${serverUrlWithPort}transcribe`;

      console.log('Sending request to:', requestUrl);
      console.log('Form data:', formData);

      // Send request to server with exact headers expected by FastAPI
      const response = await fetch(requestUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);
      
      // Update transcription text
      setTranscribedText(data.transcription);
      
      // If TTS URL is provided and speak is enabled, play it
      if (data.tts_url && speakTranscribedText) {
        const fullTtsUrl = `${serverUrlWithPort.replace(/\/$/, '')}${data.tts_url}`;
        console.log('Playing TTS from:', fullTtsUrl);
        setTtsAudioUrl(fullTtsUrl);
        setLastTtsUrl(fullTtsUrl); // Save the URL for replay
        playTtsAudio(fullTtsUrl);
      }

      Toast.show({
        type: 'success',
        text1: 'Transcription successful',
      });
    } catch (error) {
      console.error('Network or Transcription Error:', error);
      console.error('Error details:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Transcription failed',
        text2: 'Could not connect to server or process audio.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const playTtsAudio = async (audioUrl) => {
    if (!audioUrl) return;
    console.log('Playing TTS audio:', audioUrl);
    
    if (isPlaying) {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setIsPlaying(false);
    }
    
    setIsPlaying(true);

    try { 
      await audioRecorderPlayer.startPlayer(audioUrl);
      audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition === e.duration) {
          console.log('TTS Playback finished');
          audioRecorderPlayer.stopPlayer();
          audioRecorderPlayer.removePlayBackListener();
          setIsPlaying(false);
        }
      });
      Toast.show({
        type: 'success',
        text1: 'Playing TTS Audio'
      });
    } catch (error) {
      console.error('Error playing TTS audio:', error);
      Toast.show({ 
        type: 'error',
        text1: 'TTS Playback Failed',
        text2: 'Could not play TTS audio.'
      });
      setIsPlaying(false);
    }
  };

  const handleToggleTTS = (value) => {
    setSpeakTranscribedText(value); 
  };

  // Format duration to MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- UI Render ---

  if (serverUrlLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  // Determine if any recording, processing, or playback is active to disable buttons
  const isAnyRecording = isRecordingPress || isRecordingHold;
  const isAnyActive = isAnyRecording || isProcessing || isPlaying;
  
  console.log('Rendering TranscribingScreen - isAnyActive:', isAnyActive, 'recordedFilePath:', recordedFilePath);

  return (
    <View style={[styles.container, { paddingTop: 80 }]}>
      <View style={[styles.headerContainer, { marginTop: 20, marginBottom: 40 }]}>
        <Text style={styles.title}>Transcribing Screen</Text>
        {!serverUrl && <Text style={styles.warningText}>Server URL not set. Recording and transcription disabled.</Text>}
        {!hasAudioPermission && <Text style={styles.warningText}>Audio recording permission is denied. Please grant permissions in app settings to record.</Text>}
      </View>

      {/* Recording Timer and Waveform */}
      {(isRecordingPress || isRecordingHold) && (
        <View style={[styles.recordingVisualization, { marginTop: 30 }]}>
          <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
        </View>
      )}

      {/* Transcribed Text Area and TTS Toggle */}
      <View style={[styles.transcriptionContainer, { marginTop: 40 }]}>
        <Text style={styles.transcriptionTitle}>Transcribed Text:</Text>
        <Text style={styles.transcriptionText}>
          {transcribedText || 'Transcription will appear here...'}
        </Text>
        {/* TTS Toggle */}
        <View style={styles.ttsToggleContainer}>
          <Text style={styles.ttsToggleLabel}>Speak Transcription:</Text>
          <Switch
            trackColor={{ false: "#767577", true: colors.accent }}
            thumbColor={speakTranscribedText ? colors.primary : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggleTTS}
            value={speakTranscribedText}
            disabled={isProcessing || isPlaying}
          />
        </View>
      </View>

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.processingText}>Processing transcription...</Text>
        </View>
      )}

      {/* Post Recording Actions for Press Mode Only */}
      {recordedFilePath && !isAnyRecording && !isProcessing && (
        <View style={[styles.postRecordingActions, { marginTop: 30 }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={playRecording}
            disabled={isProcessing}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              {isPlaying ? "⏹️ Stop Replay" : "▶️ Replay"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={() => sendForTranscription(recordedFilePath)}
            disabled={isProcessing || isPlaying}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>📤 Send</Text>
          </TouchableOpacity>

          {/* Add Replay TTS Button */}
          {lastTtsUrl && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleReplayTTS}
              disabled={isProcessing || isPlaying}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>🔄 Replay TTS</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recording Status */}
      {isAnyRecording && ( 
        <View style={styles.recordingStatus}>
          <View style={styles.recordingIndicator} />
          <Text style={styles.recordingText}>
            {isRecordingPress ? "Recording... (Press to stop)" : "Recording... (Release to send)"}
          </Text>
        </View>
      )}

      {/* Button Container (Bottom Center) */}
      <View style={styles.bottomButtonContainer}>
        {/* Press to Record Button */}
        <TouchableOpacity
          style={[
            styles.roundButton, 
            isRecordingPress && styles.buttonActive,
            { marginRight: 30 }
          ]}
          onPress={() => {
            console.log('Press to Record Button Pressed', { isRecordingPressRef: isRecordingPressRef.current, isRecordingPress });
            if (isRecordingPress) {
              stopRecording('press');
            } else {
              startRecording('press');
            }
          }}
          disabled={isRecordingHold || isProcessing || !serverUrl || isPlaying || !hasAudioPermission}
        >
          <Text style={styles.buttonText}>{isRecordingPress ? '⏹️' : '🎤'}</Text>
          <Text style={styles.buttonLabel}>Press</Text>
        </TouchableOpacity>

        {/* Hold to Record Button */}
        <TouchableOpacity
          style={[styles.roundButton, isRecordingHold && styles.buttonActive]}
          onLongPress={() => {
            console.log('Hold to Record Button Long Pressed', { isRecordingHoldRef: isRecordingHoldRef.current, isRecordingHold });
            if (!isRecordingPress && !isRecordingHold) {
              startRecording('hold');
            } else {
              console.log('Hold to Record Button Long Pressed: Already recording, ignoring.');
            }
          }}
          onPressOut={() => {
            console.log('Hold to Record Button Press Out', { isRecordingHoldRef: isRecordingHoldRef.current, isRecordingHold });
            if (isRecordingHold) {
              stopRecording('hold');
            } else {
              console.log('Hold to Record Button Press Out: Not in hold recording mode, not stopping.');
            }
          }}
          delayLongPress={200}
          disabled={isRecordingPress || isProcessing || !serverUrl || isPlaying || !hasAudioPermission}
        >
           <Text style={styles.buttonText}>{isRecordingHold ? '✋' : '🔘'}</Text>
           <Text style={styles.buttonLabel}>Hold</Text>
        </TouchableOpacity>
      </View>

      <ServerUrlOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 80,
    paddingBottom: 120,
  },
  headerContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  roundButton: {
    backgroundColor: colors.accent,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonActive: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  buttonLabel: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  postRecordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginTop: 30,
    marginBottom: 30,
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  processingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 10,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
    marginRight: 10,
  },
  recordingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  transcriptionContainer: {
    marginTop: 40,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    width: '90%',
    backgroundColor: colors.primary,
    minHeight: 150,
    marginBottom: 30,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  transcriptionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    textAlignVertical: 'top',
  },
  ttsToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    justifyContent: 'space-between',
  },
  ttsToggleLabel: {
    fontSize: 16,
    color: colors.text,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingBottom: 20,
    zIndex: 1,
  },
  recordingVisualization: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 30,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 10,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    width: '100%',
    paddingHorizontal: 20,
  },
  waveformBar: {
    width: 3,
    backgroundColor: colors.accent,
    marginHorizontal: 2,
    borderRadius: 2,
    transition: 'height 0.1s ease-in-out',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TranscribingScreen;