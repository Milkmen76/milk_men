import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import { UserBottomTabs, VendorBottomTabs, AdminBottomTabs } from './BottomTabNavigator';

const Stack = createNativeStackNavigator();

const RoleBasedNavigator = () => {
  const { user, loading } = useAuth();

  console.log('RoleBasedNavigator - User:', user?.id);
  console.log('RoleBasedNavigator - Role:', user?.role);
  console.log('RoleBasedNavigator - Loading:', loading);

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Not logged in - show auth screens
  if (!user) {
    console.log('RoleBasedNavigator - No user, showing auth screens');
    return (
      <Stack.Navigator screenOptions={{
        headerStyle: {
          backgroundColor: '#f8f8f8',
        },
        headerTintColor: '#333',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Milk Delivery - Login' }}
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen} 
          options={{ title: 'Milk Delivery - Sign Up' }}
        />
        <Stack.Screen 
          name="ResetPassword" 
          component={ResetPasswordScreen} 
          options={{ title: 'Reset Password' }}
        />
      </Stack.Navigator>
    );
  }
  
  // Check user role and approval status if vendor
  const userRole = user.role;
  const approvalStatus = user.approval_status;
  
  // If vendor with pending approval, show pending screen
  if (userRole === 'vendor' && approvalStatus === 'pending') {
    return (
      <Stack.Navigator>
        <Stack.Screen 
          name="PendingApproval" 
          component={require('../screens/vendor/PendingApprovalScreen').default} 
          options={{ title: 'Waiting for Approval' }}
        />
      </Stack.Navigator>
    );
  }

  // Role-based navigation
  console.log(`RoleBasedNavigator - Rendering screens for role: ${userRole}`);

  // Create main navigation stack that includes both tab navigation and individual screens
  const createMainNavigator = (MainTabs, screenOptions, additionalScreens) => (
    <Stack.Navigator 
      initialRouteName="MainTabs"
      screenOptions={screenOptions}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{ headerShown: false }}
      />
      {additionalScreens.map(screen => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={screen.options}
          initialParams={screen.initialParams}
        />
      ))}
    </Stack.Navigator>
  );
  
  if (userRole === 'user') {
    // Additional screens for users that aren't in the bottom tabs
    const userAdditionalScreens = [
      {
        name: 'ProductList',
        component: require('../screens/user/ProductListScreen').default,
        options: { title: 'Products' }
      },
      {
        name: 'OrderScreen',
        component: require('../screens/user/OrderScreen').default,
        options: { title: 'Place Order' }
      },
      {
        name: 'SubscriptionScreen',
        component: require('../screens/user/SubscriptionScreen').default,
        options: { title: 'Subscribe' }
      },
      {
        name: 'HistoryScreen',
        component: require('../screens/user/HistoryScreen').default,
        options: { title: 'My Orders & Subscriptions' },
        initialParams: { initialTab: 'orders' }
      }
    ];

    return createMainNavigator(
      UserBottomTabs,
      {
        headerStyle: { backgroundColor: '#f0f8ff' },
        headerTintColor: '#333'
      },
      userAdditionalScreens
    );
  }
  
  if (userRole === 'vendor') {
    // Additional screens for vendors that aren't in the bottom tabs
    const vendorAdditionalScreens = [];

    return createMainNavigator(
      VendorBottomTabs,
      {
        headerStyle: { backgroundColor: '#fdf5e6' },
        headerTintColor: '#333'
      },
      vendorAdditionalScreens
    );
  }
  
  if (userRole === 'admin') {
    // Additional screens for admins that aren't in the bottom tabs
    const adminAdditionalScreens = [
      {
        name: 'ProductListScreen',
        component: require('../screens/admin/ProductListScreen').default,
        options: { title: 'All Products' }
      }
    ];

    return createMainNavigator(
      AdminBottomTabs,
      {
        headerStyle: { backgroundColor: '#f0fff0' },
        headerTintColor: '#333'
      },
      adminAdditionalScreens
    );
  }
  
  // Fallback for unknown roles
  console.log('RoleBasedNavigator - Unknown role, using default screens');
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="UserHome" 
        component={require('../screens/user/HomeScreen').default} 
        options={{ title: 'Home' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333'
  }
});

export default RoleBasedNavigator;
