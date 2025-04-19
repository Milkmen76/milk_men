import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, StatusBar, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all users, then filter for approved vendors
        const allUsers = await localData.getUsers();
        const approvedVendors = allUsers.filter(
          u => u.role === 'vendor' && u.approval_status === 'approved'
        );
        setVendors(approvedVendors);
        
        // Fetch user's order count
        if (user) {
          const userOrders = await localData.getOrdersByUser(user.id);
          setOrderCount(userOrders.length);
          
          // Fetch user's subscription count
          const userSubscriptions = await localData.getSubscriptionsByUser(user.id);
          setSubscriptionCount(userSubscriptions.length);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  const renderVendorItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.vendorCard}
      onPress={() => navigation.navigate('ProductList', { vendorId: item.id })}
    >
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{item.profile_info?.business_name || 'Vendor'}</Text>
        <Text style={styles.vendorAddress}>{item.profile_info?.address || 'No address provided'}</Text>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => navigation.navigate('ProductList', { vendorId: item.id })}
        >
          <Text style={styles.viewButtonText}>View Products</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="#f0f8ff" barStyle="dark-content" />
      
      <View style={styles.header}>
        <Image 
          source={require('../../assets/milk-icon.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
      </View>

      {/* Order Statistics Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>My Orders</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{subscriptionCount}</Text>
            <Text style={styles.statLabel}>Subscriptions</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('HistoryScreen')}
        >
          <Text style={styles.viewAllText}>View All Orders and Subscriptions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        <View style={styles.menuRow}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorList')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e6f2ff' }]}>
              <Text style={styles.iconText}>🏪</Text>
            </View>
            <Text style={styles.menuText}>Milk Vendors</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('HistoryScreen', { initialTab: 'orders' })}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fff0e6' }]}>
              <Text style={styles.iconText}>📋</Text>
            </View>
            <Text style={styles.menuText}>Orders</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuRow}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('HistoryScreen', { initialTab: 'subscriptions' })}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e6ffe6' }]}>
              <Text style={styles.iconText}>🔄</Text>
            </View>
            <Text style={styles.menuText}>Subscriptions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileScreen')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e6e6ff' }]}>
              <Text style={styles.iconText}>👤</Text>
            </View>
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Featured Vendors</Text>
      
      {loading ? (
        <Text style={styles.loadingText}>Loading vendors...</Text>
      ) : vendors.length > 0 ? (
        <FlatList
          data={vendors}
          renderItem={renderVendorItem}
          keyExtractor={item => item.id}
          style={styles.vendorList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          nestedScrollEnabled={true}
        />
      ) : (
        <Text style={styles.noDataText}>No vendors available at the moment</Text>
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16,
    backgroundColor: '#f9f9f9' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12
  },
  welcomeText: {
    fontSize: 16,
    color: '#666'
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333'
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14,
    color: '#666'
  },
  viewAllButton: {
    backgroundColor: '#f0f8ff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  viewAllText: {
    color: '#4e9af1',
    fontWeight: '600',
    fontSize: 14
  },
  menuContainer: {
    marginBottom: 24
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  iconText: {
    fontSize: 24
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  vendorList: {
    flex: 1
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  vendorInfo: {
    flex: 1
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333'
  },
  vendorAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  viewButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#666'
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    marginBottom: 20
  },
  footer: {
    marginTop: 10,
    marginBottom: 30,
    alignItems: 'center'
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  logoutText: {
    color: '#d9534f',
    fontWeight: '500'
  }
});

export default HomeScreen;
