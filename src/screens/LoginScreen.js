import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/colors';
import { getData, storeData } from '../utils/storage';

const LoginScreen = ({ navigation, route }) => {
  console.log('Rendering LoginScreen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { onAuthStatusChange } = route.params || {};

  const handleLogin = async () => {
    console.log('Login button pressed');
    if (email && password) {
      console.log('Email and password entered. Attempting login...');
      const userData = await getData('user');
      console.log('Retrieved user data from storage:', userData);
      if (userData) {
        const user = JSON.parse(userData);
        console.log('Parsed user data:', user);
        if (user.email === email && user.password === password) {
          console.log('Credentials match. Setting user token...');
          await storeData('userToken', 'logged_in');
          console.log('User token successfully set in storage.');
          Toast.show({
            type: 'success',
            text1: 'Login Successful',
            text2: 'Welcome back!'
          });
          if (onAuthStatusChange) {
            onAuthStatusChange();
            console.log('onAuthStatusChange called after login.');
          }
        } else {
          console.log('Credentials do not match.');
          Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2: 'Invalid email or password.'
          });
        }
      } else {
        console.log('No user data found in storage.');
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: 'No user found. Please sign up.'
        });
      }
    } else {
      console.log('Email or password not entered.');
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: 'Please enter email and password.'
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
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
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.switchText}>Don't have an account? Sign Up</Text>
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

export default LoginScreen; 