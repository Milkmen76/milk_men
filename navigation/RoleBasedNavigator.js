import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

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
  
  if (userRole === 'user') {
    return (
      <Stack.Navigator screenOptions={{
        headerStyle: {
          backgroundColor: '#f0f8ff', // Light blue for user screens
        },
        headerTintColor: '#333',
      }}>
        <Stack.Screen 
          name="UserHome" 
          component={require('../screens/user/HomeScreen').default} 
          options={{ title: 'Home' }}
        />
        <Stack.Screen 
          name="VendorList" 
          component={require('../screens/user/VendorListScreen').default} 
          options={{ title: 'Milk Vendors' }}
        />
        <Stack.Screen 
          name="ProductList" 
          component={require('../screens/user/ProductListScreen').default} 
          options={{ title: 'Products' }}
        />
        <Stack.Screen 
          name="OrderScreen" 
          component={require('../screens/user/OrderScreen').default} 
          options={{ title: 'Place Order' }}
        />
        <Stack.Screen 
          name="SubscriptionScreen" 
          component={require('../screens/user/SubscriptionScreen').default} 
          options={{ title: 'Subscribe' }}
        />
        <Stack.Screen 
          name="HistoryScreen" 
          component={require('../screens/user/HistoryScreen').default} 
          options={{ title: 'My Orders & Subscriptions' }}
          initialParams={{ initialTab: 'orders' }}
        />
        <Stack.Screen 
          name="ProfileScreen" 
          component={require('../screens/user/ProfileScreen').default} 
          options={{ title: 'My Profile' }}
        />
      </Stack.Navigator>
    );
  }
  
  if (userRole === 'vendor') {
    return (
      <Stack.Navigator screenOptions={{
        headerStyle: {
          backgroundColor: '#fdf5e6', // Light orange for vendor screens
        },
        headerTintColor: '#333',
      }}>
        <Stack.Screen 
          name="DashboardScreen" 
          component={require('../screens/vendor/DashboardScreen').default} 
          options={{ title: 'Vendor Dashboard' }}
        />
        <Stack.Screen 
          name="ProductManagementScreen" 
          component={require('../screens/vendor/ProductManagementScreen').default} 
          options={{ title: 'Manage Products' }}
        />
        <Stack.Screen 
          name="OrderManagementScreen" 
          component={require('../screens/vendor/OrderManagementScreen').default} 
          options={{ title: 'Manage Orders' }}
        />
        <Stack.Screen 
          name="ProfileScreen" 
          component={require('../screens/vendor/ProfileScreen').default} 
          options={{ title: 'Vendor Profile' }}
        />
      </Stack.Navigator>
    );
  }
  
  if (userRole === 'admin') {
    return (
      <Stack.Navigator screenOptions={{
        headerStyle: {
          backgroundColor: '#f0fff0', // Light green for admin screens
        },
        headerTintColor: '#333',
      }}>
        <Stack.Screen 
          name="VendorApproval" 
          component={require('../screens/admin/VendorApprovalScreen').default} 
          options={{ title: 'Vendor Approvals' }}
        />
        <Stack.Screen 
          name="UserListScreen" 
          component={require('../screens/admin/UserListScreen').default} 
          options={{ title: 'All Users' }}
        />
        {/* VendorListScreen removed - using VendorApproval instead */}
        <Stack.Screen 
          name="ProductListScreen" 
          component={require('../screens/admin/ProductListScreen').default} 
          options={{ title: 'All Products' }}
        />
        <Stack.Screen 
          name="TransactionListScreen" 
          component={require('../screens/admin/TransactionListScreen').default} 
          options={{ title: 'All Transactions' }}
        />
        <Stack.Screen 
          name="ProfileScreen" 
          component={require('../screens/admin/ProfileScreen').default} 
          options={{ title: 'Admin Profile' }}
        />
      </Stack.Navigator>
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
