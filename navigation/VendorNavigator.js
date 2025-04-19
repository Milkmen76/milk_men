import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/vendor/DashboardScreen';
import ProductsScreen from '../screens/vendor/ProductsScreen';
import OrdersScreen from '../screens/vendor/OrdersScreen';
import OrderDetailScreen from '../screens/vendor/OrderDetailScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import ProductCreateScreen from '../screens/vendor/ProductCreateScreen';
import TransactionsScreen from '../screens/vendor/TransactionsScreen';

const Stack = createStackNavigator();

const VendorNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4e9af1',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Vendor Dashboard',
        }}
      />
      <Stack.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: 'My Products',
        }}
      />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Manage Orders',
        }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={({ route }) => ({
          title: `Order #${route.params.orderId}`,
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
        }}
      />
      <Stack.Screen
        name="ProductCreate"
        component={ProductCreateScreen}
        options={{
          title: 'Add New Product',
        }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'My Transactions',
        }}
      />
    </Stack.Navigator>
  );
};

export default VendorNavigator; 