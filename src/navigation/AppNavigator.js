import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import MainTabsNavigator from './MainTabsNavigator';
import { getData } from '../utils/storage';

const RootStack = createNativeStackNavigator();

const AppNavigator = () => {
  console.log('Rendering AppNavigator'); // Log when AppNavigator renders
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkLoginStatus = useCallback(async () => {
    console.log('Checking login status...'); // Log when checking status
    const userToken = await getData('userToken');
    console.log('Retrieved userToken:', userToken); // Log the retrieved token
    const newState = !!userToken; // Determine the new state
    setIsLoggedIn(newState);
    console.log('setIsLoggedIn called with:', newState); // Log the value passed to setIsLoggedIn
    // The state update might not be immediate in this console log
    console.log('isLoggedIn state after update attempt:', isLoggedIn); // Log the state value (might not be updated immediately)
    setLoading(false);
    console.log('Loading set to false.'); // Log when loading is done
  }, [isLoggedIn]); // Add isLoggedIn as a dependency to potentially re-run when it changes

  useEffect(() => {
    console.log('AppNavigator useEffect running'); // Log when useEffect runs
    checkLoginStatus();
  }, [checkLoginStatus]); // Add checkLoginStatus as a dependency

  if (loading) {
    console.log('AppNavigator is loading...'); // Log when loading
    return null; // Or a loading component
  }

  console.log('AppNavigator rendering based on isLoggedIn:', isLoggedIn); // Log before rendering stack

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <RootStack.Screen name="MainTabs">
            {(props) => <MainTabsNavigator {...props} onAuthStatusChange={checkLoginStatus} />}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Auth">
            {(props) => <AuthNavigator {...props} onAuthStatusChange={checkLoginStatus} />}
          </RootStack.Screen>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 