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
  Image,
  StatusBar
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Admin Dashboard</Text>
            <Text style={styles.businessName}>My Profile</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
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
            onPress={() => navigation.navigate('ProductListScreen')}
          >
            <Text style={styles.navButtonText}>Product Management</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerContainer: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.PADDING_M,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: SIZES.BODY,
    color: '#666'
  },
  businessName: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333'
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    padding: SIZES.PADDING_L,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: SIZES.PADDING_M,
    color: '#666',
    fontSize: SIZES.BODY
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileImageContainer: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  profileImage: {
    width: scale(40),
    height: scale(40)
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
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 24
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
    marginBottom: 12,
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
    fontSize: 22,
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
    marginTop: 8,
    marginBottom: 24
  },
  navButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333'
  },
  signOutButton: {
    backgroundColor: '#ff5252',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
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
  signOutText: {
    fontSize: SIZES.BODY,
    fontWeight: '600',
    color: '#fff'
  }
});

export default ProfileScreen;
