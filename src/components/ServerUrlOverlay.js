import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useServerUrl } from '../context/ServerUrlContext';
import { colors } from '../theme/colors';

const ServerUrlOverlay = () => {
  const { serverUrl, loading } = useServerUrl();
  const navigation = useNavigation();

  if (loading || serverUrl) {
    return null; // Don't show overlay if loading or URL is set
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>Server URL not set.</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 128, 128, 0.7)', // Grey with 70% opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Ensure it is above other content
  },
  messageBox: {
    backgroundColor: colors.primary, // White background
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 18,
    marginBottom: 15,
    color: colors.text, // Black text
  },
  settingsButton: {
    backgroundColor: colors.accent, // Darker blue accent color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  settingsButtonText: {
    fontSize: 16,
    color: colors.primary, // White text
    fontWeight: 'bold',
  },
});

export default ServerUrlOverlay; 