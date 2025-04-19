import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { UserBottomTabs } from './BottomTabNavigator';

// Import screens
import ProductListScreen from '../screens/user/ProductListScreen';
import OrderScreen from '../screens/user/OrderScreen';
import OrderHistoryScreen from '../screens/user/OrderHistoryScreen';
import OrderDetailScreen from '../screens/user/OrderDetailScreen';
import SubscriptionScreen from '../screens/user/SubscriptionScreen';
import SubscriptionDetailScreen from '../screens/user/SubscriptionDetailScreen';
import CategoryProductsScreen from '../screens/user/CategoryProductsScreen';

const Stack = createStackNavigator();

const UserNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4e9af1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="UserHome" 
        component={UserBottomTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={({ route }) => ({ title: route.params?.vendorName || 'Products' })}
      />
      <Stack.Screen 
        name="OrderScreen" 
        component={OrderScreen} 
        options={{ title: 'Confirm Order' }}
      />
      <Stack.Screen 
        name="OrderHistoryScreen" 
        component={OrderHistoryScreen} 
        options={{ title: 'Order History' }}
      />
      <Stack.Screen 
        name="OrderDetailScreen" 
        component={OrderDetailScreen} 
        options={{ title: 'Order Details' }}
      />
      <Stack.Screen 
        name="SubscriptionScreen" 
        component={SubscriptionScreen} 
        options={{ title: 'Subscribe' }}
      />
      <Stack.Screen 
        name="SubscriptionDetailScreen" 
        component={SubscriptionDetailScreen} 
        options={{ title: 'Subscription Details' }}
      />
      <Stack.Screen 
        name="CategoryProducts" 
        component={CategoryProductsScreen} 
        options={({ route }) => ({ title: `${route.params?.categoryName || 'Category'} Products` })}
      />
    </Stack.Navigator>
  );
};

export default UserNavigator; 