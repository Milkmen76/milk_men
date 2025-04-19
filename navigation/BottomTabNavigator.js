import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Icons for tabs
const TabIcon = ({ name, focused }) => {
  let iconText = '';
  let color = focused ? '#4e9af1' : '#888';
  
  switch (name) {
    case 'Home':
      iconText = '🏠';
      break;
    case 'Orders':
      iconText = '📋';
      break;
    case 'Vendors':
      iconText = '🏪';
      break;
    case 'Products':
      iconText = '🥛';
      break;
    case 'Profile':
      iconText = '👤';
      break;
    case 'Dashboard':
      iconText = '📊';
      break;
    case 'Manage':
      iconText = '⚙️';
      break;
    case 'Users':
      iconText = '👥';
      break;
    case 'Approvals':
      iconText = '✓';
      break;
    case 'Transactions':
      iconText = '💰';
      break;
    default:
      iconText = '•';
  }
  
  return (
    <View style={[styles.iconContainer, focused && styles.focusedIcon]}>
      <Text style={[styles.icon, { color }]}>{iconText}</Text>
      <Text style={[styles.label, { color }]}>{name}</Text>
    </View>
  );
};

const Tab = createBottomTabNavigator();

// Bottom tabs for user role
export const UserBottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="UserHomeTab" 
        component={require('../screens/user/HomeScreen').default} 
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="HistoryTab" 
        component={require('../screens/user/HistoryScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Orders" focused={focused} />,
        }}
        initialParams={{ initialTab: 'orders' }}
      />
      <Tab.Screen 
        name="VendorListTab" 
        component={require('../screens/user/VendorListScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Vendors" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={require('../screens/user/ProfileScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Bottom tabs for vendor role
export const VendorBottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={require('../screens/vendor/DashboardScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="OrderManagementTab" 
        component={require('../screens/vendor/OrderManagementScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Orders" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="ProductManagementTab" 
        component={require('../screens/vendor/ProductManagementScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Products" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={require('../screens/vendor/ProfileScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Bottom tabs for admin role
export const AdminBottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="TransactionsTab" 
        component={require('../screens/admin/TransactionListScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Transactions" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="VendorApprovalTab" 
        component={require('../screens/admin/VendorApprovalScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Approvals" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="UserListTab" 
        component={require('../screens/admin/UserListScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Users" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={require('../screens/admin/ProfileScreen').default}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    borderTopWidth: 0,
    paddingTop: 5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    width: 70,
  },
  focusedIcon: {
    borderRadius: 20,
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default { UserBottomTabs, VendorBottomTabs, AdminBottomTabs }; 