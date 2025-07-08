import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const AuthStack = createNativeStackNavigator();

const AuthNavigator = ({ onAuthStatusChange }) => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onAuthStatusChange={onAuthStatusChange} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Signup">
        {(props) => <SignupScreen {...props} onAuthStatusChange={onAuthStatusChange} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
};

export default AuthNavigator; 