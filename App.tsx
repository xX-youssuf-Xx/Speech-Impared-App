/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import Toast, { BaseToast, ErrorToast, ToastShowParams } from 'react-native-toast-message';
import { colors } from './src/theme/colors';

/*
  1. Create the config
*/
const toastConfig = {
  /*
    Override 'success' type, adding a span around the text
  */
  success: (props: ToastShowParams) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: colors.accent }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
      }}
      text2Style={{
        fontSize: 16,
        color: colors.text,
      }}
    />
  ),
  /*
    Override 'error' type, adding a span around the text
  */
  error: (props: ToastShowParams) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#FF0000' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
      }}
      text2Style={{
        fontSize: 16,
        color: colors.text,
      }}
    />
  ),
};

function App(): React.JSX.Element {
  return (
    <>
      <AppNavigator />
      <Toast config={toastConfig} />
    </>
  );
}

export default App;
  