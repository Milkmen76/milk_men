import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import * as localData from './services/localData';

export default function App() {
  // Initialize local data storage
  useEffect(() => {
    const initData = async () => {
      try {
        await localData.initializeData();
        console.log('Local data initialized');
      } catch (error) {
        console.error('Error initializing local data:', error);
      }
    };
    
    initData();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
