import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/colors';
import { storeData } from '../utils/storage';

const SignupScreen = ({ navigation, route }) => {
  console.log('Rendering SignupScreen'); // Log when SignupScreen renders
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { onAuthStatusChange } = route.params || {}; // Extract the function

  const handleSignup = async () => {
    console.log('Sign Up button pressed'); // Log when button is pressed
    if (email && password) {
      console.log('Email and password entered. Attempting signup...'); // Log before storage access
      // In a real app, you would hash the password before saving
      await storeData('user', JSON.stringify({ email, password }));
      console.log('User data saved to storage.'); // Log after saving user data
      // For pseudo-authentication, we'll also set a login status token
      await storeData('userToken', 'signed_up');
      console.log('User token set after signup.'); // Log after setting token
      Toast.show({
        type: 'success',
        text1: 'Signed Up Successfully',
        text2: 'You can now log in.'
      });
      // Navigate back to Login screen after signup
      navigation.navigate('Login');
      console.log('Navigating to Login after signup.'); // Log navigation after signup
      // Call the function to notify AppNavigator to re-check auth status
      if (onAuthStatusChange) {
        onAuthStatusChange();
        console.log('onAuthStatusChange called after signup.');
      }
    } else {
      console.log('Email or password not entered for signup.'); // Log missing fields
      Toast.show({
        type: 'error',
        text1: 'Sign Up Failed',
        text2: 'Please enter email and password.'
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.switchText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 40,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.primary,
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: colors.accent,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  switchText: {
    fontSize: 16,
    color: colors.accent,
  },
});

export default SignupScreen; 