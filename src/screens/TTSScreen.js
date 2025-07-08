import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import ServerUrlOverlay from '../components/ServerUrlOverlay';
import { useServerUrl } from '../context/ServerUrlContext';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Toast from 'react-native-toast-message';

const audioRecorderPlayer = new AudioRecorderPlayer();

const TTSScreen = () => {
  const { serverUrl, loading } = useServerUrl();
  const [textToSpeak, setTextToSpeak] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTtsUrl, setLastTtsUrl] = useState(null);

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
        text1: 'Playing TTS Audio',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Error playing TTS audio:', error);
      Toast.show({
        type: 'error',
        text1: 'Playback Failed',
        text2: 'Could not play TTS audio.',
        position: 'bottom',
      });
      setIsPlaying(false);
    }
  };

  const handleReplay = async () => {
    if (!lastTtsUrl) {
      Toast.show({
        type: 'error',
        text1: 'No Audio Available',
        text2: 'Generate TTS audio first.',
        position: 'bottom',
      });
      return;
    }
    await playTtsAudio(lastTtsUrl);
  };

  const handleSpeak = async () => {
    if (!serverUrl) {
      Toast.show({
        type: 'error',
        text1: 'Server URL not set',
        text2: 'Please set the server URL in Settings.',
        position: 'bottom',
      });
      return;
    }
    if (textToSpeak.trim() === '') {
      Toast.show({
        type: 'error',
        text1: 'Empty Text',
        text2: 'Please enter text to speak.',
        position: 'bottom',
      });
      return;
    }

    setIsProcessing(true);
    console.log('Sending text for TTS:', textToSpeak);

    try {
      // Ensure server URL has port 8000
      const serverUrlWithPort = serverUrl.includes(':8000') ? serverUrl : `${serverUrl.replace(/\/$/, '')}:8000/`;
      const requestUrl = `${serverUrlWithPort}tts`;

      console.log('Sending request to:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);

      if (data.tts_url) {
        // Construct the full TTS URL
        const fullTtsUrl = `${serverUrlWithPort.replace(/\/$/, '')}${data.tts_url}`;
        console.log('Playing TTS from:', fullTtsUrl);
        setLastTtsUrl(fullTtsUrl); // Save the URL for replay
        await playTtsAudio(fullTtsUrl);
      } else {
        throw new Error('No TTS URL in response');
      }

      // Clear the input field after successful TTS
      setTextToSpeak('');
    } catch (error) {
      console.error('TTS Error:', error);
      Toast.show({
        type: 'error',
        text1: 'TTS Generation Failed',
        text2: 'Could not generate or play TTS audio.',
        position: 'bottom',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TTS Screen</Text>

      {!serverUrl && <Text style={styles.warningText}>Server URL not set. TTS features disabled.</Text>}

      <TextInput
        style={styles.textArea}
        multiline={true}
        numberOfLines={4}
        placeholder="Enter text to speak"
        placeholderTextColor={colors.text + '80'}
        value={textToSpeak}
        onChangeText={setTextToSpeak}
        textAlignVertical="top"
        editable={!!serverUrl && !isProcessing}
      />

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.processingText}>Generating speech...</Text>
        </View>
      )}

      {/* Button Container */}
      <View style={styles.buttonContainer}>
        <Button
          title={isPlaying ? "Stop" : "Speak"}
          onPress={handleSpeak}
          color={colors.accent}
          disabled={!serverUrl || textToSpeak.trim() === '' || isProcessing}
        />

        {/* Separate Replay Button */}
        <TouchableOpacity
          style={[
            styles.replayButton,
            (!lastTtsUrl || isProcessing) && styles.buttonDisabled
          ]}
          onPress={handleReplay}
          disabled={!lastTtsUrl || isProcessing}
        >
          <Text style={styles.replayButtonText}>🔄 Replay Last Audio</Text>
        </TouchableOpacity>
      </View>

      <ServerUrlOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  textArea: {
    width: '90%',
    height: 150,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '90%',
    gap: 15, // Add space between buttons
  },
  replayButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  replayButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
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
});

export default TTSScreen; 