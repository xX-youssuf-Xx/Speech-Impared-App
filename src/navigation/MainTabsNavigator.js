import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TrainingScreen from '../screens/TrainingScreen';
import TranscribingScreen from '../screens/TranscribingScreen';
import TTSScreen from '../screens/TTSScreen';
import SettingsScreen from '../screens/SettingsScreen';
// Removed LoginScreen import as it's not used in tabs
import { View, Text, StyleSheet } from 'react-native';
// Removed vector icon imports
// import Icon from 'react-native-vector-icons/FontAwesome';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import Icon from 'react-native-vector-icons/Ionicons';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { getData } from '../utils/storage';
import { ServerUrlProvider } from '../context/ServerUrlContext';

const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

// Fallback text icons if vector icons don't work
const FallbackIcon = ({ name, color, size }) => {
  const iconMap = {
    'Training': '🏆',
    'Transcribing': '🎤',
    'TTS': '🔊',
    'Settings': '⚙️',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.fallbackIcon, { color, fontSize: size - 4 }]}>
        {iconMap[name] || '●'}
      </Text>
    </View>
  );
};

// Accept onAuthStatusChange as a prop
const MainTabsNavigator = ({ onAuthStatusChange }) => {
  const [initialRoute, setInitialRoute] = React.useState('Transcribing'); // Default to Transcribing
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkLogin = async () => {
      try {
        const userToken = await getData('userToken');
        // The login check is now handled by AppNavigator, so we just set initial route
        // based on whether a token exists (though AppNavigator already ensures we are logged in here)
        if (userToken) {
           setInitialRoute('Transcribing');
        } else {
           // This case should ideally not be hit if AppNavigator logic is correct,
           // but setting a fallback just in case.
           setInitialRoute('Training'); // Or another appropriate default
        }
      } catch (error) {
        console.error('Error checking login status in MainTabsNavigator:', error);
         setInitialRoute('Training'); // Fallback route on error
      } finally {
        setLoading(false);
      }
    };
    checkLogin();
  }, []); // No dependencies needed as the logic here is simplified

  const getTabBarIcon = ({ focused, color, size, route }) => {
    // Always use FallbackIcon now
    return <FallbackIcon name={route.name} color={color} size={size} />;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <ServerUrlProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent || '#007AFF',
          tabBarInactiveTintColor: colors.text || '#8E8E93',
          tabBarStyle: {
            backgroundColor: colors.primary || '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: colors.border || '#E5E5E5',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          tabBarIcon: ({ focused, color, size }) =>
            getTabBarIcon({ focused, color, size, route }),
        })}
        initialRouteName={initialRoute}
      >
        {/* Removed Login screen from tabs */}
        <Tab.Screen
          name="Training"
          component={TrainingScreen}
          options={{
            tabBarLabel: 'Training',
          }}
        />
        <Tab.Screen
          name="Transcribing"
          component={TranscribingScreen}
          options={{
            tabBarLabel: 'Record',
          }}
        />
        <Tab.Screen
          name="TTS"
          component={TTSScreen}
          options={{
            tabBarLabel: 'Speech',
          }}
        />
        {/* Pass component as children and the prop directly to SettingsScreen */}
        <Tab.Screen name="Settings">
          {(props) => <SettingsScreen {...props} onAuthStatusChange={onAuthStatusChange} />}
        </Tab.Screen>
      </Tab.Navigator>
    </ServerUrlProvider>
  );
};

export default MainTabsNavigator;