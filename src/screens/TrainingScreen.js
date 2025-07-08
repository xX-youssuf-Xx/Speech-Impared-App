import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../theme/colors';
import ServerUrlOverlay from '../components/ServerUrlOverlay';
import { useServerUrl } from '../context/ServerUrlContext';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';

const audioRecorderPlayer = new AudioRecorderPlayer();

const TrainingScreen = () => {
  const { serverUrl, loading } = useServerUrl();
  const [currentSentence, setCurrentSentence] = useState(null);
  const [nextSentence, setNextSentence] = useState(null);
  const [currentSentenceNumber, setCurrentSentenceNumber] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedFilePath, setRecordedFilePath] = useState(null);
  const [hasUploaded, setHasUploaded] = useState(false);

  // Fetch initial sentences
  useEffect(() => {
    if (serverUrl) {
      fetchSentences(1);
    }
  }, [serverUrl]);

  const fetchSentences = async (sentenceNumber) => {
    try {
      const serverUrlWithPort = serverUrl.includes(':8000') ? serverUrl : `${serverUrl.replace(/\/$/, '')}:8000/`;
      const response = await fetch(`${serverUrlWithPort}statements/${sentenceNumber}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentSentence(data);

      // Fetch next sentence
      const nextResponse = await fetch(`${serverUrlWithPort}statements/${sentenceNumber + 1}`);
      if (nextResponse.ok) {
        const nextData = await nextResponse.json();
        setNextSentence(nextData);
      }
    } catch (error) {
      console.error('Error fetching sentences:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to fetch sentences',
        text2: error.message,
      });
    }
  };

  const startRecording = async () => {
    try {
      const uri = `${RNFS.DocumentDirectoryPath}/recording_${Date.now()}.wav`;
      const audioSet = {
        AudioEncoderAndroid: 'aac',
        AudioSourceAndroid: 'mic',
        AVEncoderAudioQualityKeyIOS: 'high',
        AVNumberOfChannelsKeyIOS: 2,
        AVFormatIDKeyIOS: 'aac',
      };

      await audioRecorderPlayer.startRecorder(uri, audioSet);
      setIsRecording(true);
      setRecordedFilePath(uri);
      setHasUploaded(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      Toast.show({
        type: 'error',
        text1: 'Recording failed',
        text2: error.message,
      });
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Toast.show({
        type: 'error',
        text1: 'Stop recording failed',
        text2: error.message,
      });
    }
  };

  const uploadRecording = async () => {
    if (!recordedFilePath) {
      Toast.show({
        type: 'error',
        text1: 'No recording available',
        text2: 'Please record your reading first.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const serverUrlWithPort = serverUrl.includes(':8000') ? serverUrl : `${serverUrl.replace(/\/$/, '')}:8000/`;
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? recordedFilePath : `file://${recordedFilePath}`,
        name: 'filename.wav',
        type: 'audio/wav'
      });

      const response = await fetch(
        `${serverUrlWithPort}upload-statement-audio/${currentSentenceNumber}`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      Toast.show({
        type: 'success',
        text1: 'Upload successful',
        text2: data.message,
      });
      setHasUploaded(true);
    } catch (error) {
      console.error('Error uploading recording:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextSentence = () => {
    if (!hasUploaded) {
      Toast.show({
        type: 'error',
        text1: 'Upload required',
        text2: 'Please record and upload your reading before proceeding.',
      });
      return;
    }

    const nextNumber = currentSentenceNumber + 1;
    setCurrentSentenceNumber(nextNumber);
    setCurrentSentence(nextSentence);
    setNextSentence(null);
    setRecordedFilePath(null);
    setHasUploaded(false);
    fetchSentences(nextNumber + 1);
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
      <Text style={styles.title}>Training Screen</Text>

      {!serverUrl && <Text style={styles.warningText}>Server URL not set. Training features disabled.</Text>}

      {currentSentence && (
        <View style={styles.sentenceContainer}>
          <Text style={styles.sentenceNumber}>Sentence {currentSentence.line_number}</Text>
          <Text style={styles.sentenceText}>{currentSentence.statement}</Text>
        </View>
      )}

      <View style={styles.recordingContainer}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
          </Text>
        </TouchableOpacity>

        {recordedFilePath && !hasUploaded && (
          <TouchableOpacity
            style={[styles.uploadButton, isProcessing && styles.buttonDisabled]}
            onPress={uploadRecording}
            disabled={isProcessing}
          >
            <Text style={styles.uploadButtonText}>
              {isProcessing ? 'Uploading...' : '📤 Upload Recording'}
            </Text>
          </TouchableOpacity>
        )}

        {hasUploaded && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextSentence}
          >
            <Text style={styles.nextButtonText}>⏭️ Next Sentence</Text>
          </TouchableOpacity>
        )}
      </View>

      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

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
  sentenceContainer: {
    width: '90%',
    padding: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
    marginBottom: 30,
  },
  sentenceNumber: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 10,
  },
  sentenceText: {
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
  },
  recordingContainer: {
    width: '90%',
    alignItems: 'center',
    gap: 15,
  },
  recordButton: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: colors.error,
  },
  recordButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  processingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: colors.primary,
    fontSize: 18,
    marginTop: 10,
  },
});

export default TrainingScreen; 