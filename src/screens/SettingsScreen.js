import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Button } from 'react-native';
import { colors } from '../theme/colors';
import { removeData, storeData, getData } from '../utils/storage';

const SettingsScreen = ({ onAuthStatusChange }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState(null);

  useEffect(() => {
    const loadUrl = async () => {
      const url = await getData('serverUrl');
      if (url) {
        setSavedUrl(url);
      }
    };
    loadUrl();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            console.log('Removing user token for logout...');
            await removeData('userToken');
            console.log('User token removed.');
            if (onAuthStatusChange) {
              onAuthStatusChange();
              console.log('onAuthStatusChange called after logout.');
            }
          },
        },
      ]
    );
  };

  const handleSaveUrl = async () => {
    if (serverUrl.trim() === '') {
      Alert.alert('Save Error', 'Server URL cannot be empty.');
      return;
    }

    // Ensure URL has http:// prefix and port number
    let formattedUrl = serverUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'http://' + formattedUrl;
    }
    
    // Ensure URL has port number
    if (!formattedUrl.includes(':8000')) {
      formattedUrl = formattedUrl.replace(/\/?$/, ':8000/');
    }

    try {
      await storeData('serverUrl', formattedUrl);
      setSavedUrl(formattedUrl);
      Alert.alert('Success', 'Server URL saved successfully.');
    } catch (error) {
      console.error('Error saving server URL:', error);
      Alert.alert('Error', 'Failed to save server URL.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
        <View style={styles.urlInputContainer}>
          <TextInput
            style={styles.urlInput}
            placeholder={savedUrl ? `${savedUrl}` : 'enter the server url'}
            placeholderTextColor={colors.text}
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize='none'
          />
          <Button title="Save" onPress={handleSaveUrl} color={colors.accent} />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // White background
    padding: 20,
  },
  title: {
    fontSize: 24, // Make title smaller
    fontWeight: 'bold',
    color: colors.text, // Black text
    textAlign: 'center',
    marginTop: 30, // Make title lower
    marginBottom: 30,
  },
  settingsSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border, // Use border color from theme
    borderRadius: 0,
  },
  sectionTitle: {
    fontSize: 18, // Slightly smaller section title
    fontWeight: 'bold',
    color: colors.text, // Black text
    marginBottom: 10,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border, // Use border color from theme
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    fontSize: 16,
    color: colors.text, // Black text
  },
  logoutButton: {
    backgroundColor: colors.accent, // Use darker accent color from theme
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary, // White text on button
  },
});

export default SettingsScreen; 