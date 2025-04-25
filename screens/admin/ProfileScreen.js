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
    backgroundColor: '#f5f7fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
    paddingBottom: SIZES.PADDING_L
  },
  scrollContent: {
    paddingBottom: SIZES.PADDING_L
  },
  header: {
    paddingVertical: SIZES.PADDING_L,
    paddingHorizontal: SIZES.PADDING_M,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2),
  },
  title: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333'
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_L,
    borderRadius: SIZES.RADIUS_L,
    padding: SIZES.PADDING_M,
    alignItems: 'center',
    ...getShadowStyles(3),
  },
  profileImageContainer: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_M
  },
  profileImage: {
    width: scale(40),
    height: scale(40)
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S
  },
  profileEmail: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_S
  },
  roleBadge: {
    backgroundColor: '#d9534f',
    paddingHorizontal: SIZES.PADDING_S,
    paddingVertical: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_S,
    alignSelf: 'flex-start'
  },
  roleText: {
    color: '#fff',
    fontSize: SIZES.SMALL,
    fontWeight: '600'
  },
  loadingContainer: {
    padding: SIZES.PADDING_L,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: SIZES.PADDING_M,
    color: '#666',
    fontSize: SIZES.BODY
  },
  statsContainer: {
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_L
  },
  sectionTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_M,
    marginLeft: SIZES.PADDING_XS
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    alignItems: 'center',
    ...getShadowStyles(2),
  },
  statValue: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: SIZES.PADDING_XS
  },
  statLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666'
  },
  navigationSection: {
    padding: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_S
  },
  navButton: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    flexDirection: 'row',
    alignItems: 'center',
    ...getShadowStyles(2),
  },
  navButtonText: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333'
  },
  signOutButton: {
    backgroundColor: '#ff5252',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_S,
    alignItems: 'center',
    ...getShadowStyles(2),
  },
  signOutText: {
    fontSize: SIZES.BODY,
    fontWeight: '600',
    color: '#fff'
  }
});

export default ProfileScreen;
