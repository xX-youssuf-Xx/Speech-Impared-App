import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // saving error
    console.error('Error storing data:', e);
  }
};

export const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch (e) {
    // error reading value
    console.error('Error getting data:', e);
  }
  return null;
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // remove error
    console.error('Error removing data:', e);
  }
}; 