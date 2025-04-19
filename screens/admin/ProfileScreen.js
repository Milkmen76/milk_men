import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView, 
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    vendors: 0,
    pendingVendors: 0,
    products: 0,
    transactions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load users statistics
      const allUsers = await localData.getUsers();
      const users = allUsers.filter(u => u.role === 'user').length;
      const vendors = allUsers.filter(u => u.role === 'vendor').length;
      const pendingVendors = allUsers.filter(
        u => u.role === 'vendor' && (!u.approval_status || u.approval_status === 'pending')
      ).length;
      
      // Load products statistics
      const allProducts = await localData.getProducts();
      const products = allProducts.length;
      
      // Load transactions statistics
      const allTransactions = await localData.getTransactions();
      const transactions = allTransactions.length;
      
      setStats({
        users,
        vendors,
        pendingVendors,
        products,
        transactions
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Admin Profile</Text>
        </View>
        
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={require('../../assets/milk-icon.png')} 
              style={styles.profileImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Admin'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'admin@example.com'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Administrator</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4e9af1" />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>System Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.users}</Text>
                <Text style={styles.statLabel}>Users</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.vendors}</Text>
                <Text style={styles.statLabel}>Vendors</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.pendingVendors}</Text>
                <Text style={styles.statLabel}>Pending Approvals</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.products}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.transactions}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('VendorApproval')}
          >
            <Text style={styles.navButtonText}>Vendor Approvals</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('UserListScreen')}
          >
            <Text style={styles.navButtonText}>User Management</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('ProductListScreen')}
          >
            <Text style={styles.navButtonText}>Product Management</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('TransactionListScreen')}
          >
            <Text style={styles.navButtonText}>Transaction History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={logout}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  profileImage: {
    width: 40,
    height: 40
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  roleBadge: {
    backgroundColor: '#d9534f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginLeft: 4
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 6
  },
  statLabel: {
    fontSize: 14,
    color: '#666'
  },
  navigationSection: {
    padding: 16,
    marginTop: 10
  },
  navButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  signOutButton: {
    backgroundColor: '#ff5252',
    borderRadius: 10,
    padding: 16,
    marginTop: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});

export default ProfileScreen;
