import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const VendorApprovalScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  
  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    // Filter vendors based on search query and active tab
    const filtered = vendors.filter(vendor => {
      const matchesSearch = 
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = 
        (activeTab === 'pending' && (!vendor.approval_status || vendor.approval_status === 'pending')) ||
        (activeTab === 'approved' && vendor.approval_status === 'approved') ||
        (activeTab === 'rejected' && vendor.approval_status === 'rejected');
      
      return matchesSearch && matchesTab;
    });
    
    setFilteredVendors(filtered);
  }, [vendors, searchQuery, activeTab]);

  const loadVendors = async () => {
    try {
      setRefreshing(true);
      const users = await localData.getUsers();
      // Filter users with role 'vendor'
      const allVendors = users.filter(user => user.role === 'vendor');
      setVendors(allVendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
      Alert.alert('Error', 'Failed to load vendors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (vendor) => {
    try {
      setRefreshing(true);
      await localData.updateUser(vendor.id, { approval_status: 'approved' });
      Alert.alert('Success', `${vendor.name} has been approved`);
      loadVendors(); // Refresh the list
    } catch (error) {
      console.error('Error approving vendor:', error);
      Alert.alert('Error', 'Failed to approve vendor');
    } finally {
      setRefreshing(false);
    }
  };

  const handleReject = async (vendor) => {
    try {
      setRefreshing(true);
      await localData.updateUser(vendor.id, { approval_status: 'rejected' });
      Alert.alert('Notice', `${vendor.name} has been rejected`);
      loadVendors(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      Alert.alert('Error', 'Failed to reject vendor');
    } finally {
      setRefreshing(false);
    }
  };

  const renderVendorItem = ({ item }) => (
    <View style={styles.vendorCard}>
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{item.name}</Text>
        <Text style={styles.vendorEmail}>{item.email}</Text>
        <Text style={styles.vendorDetail}>
          Status: <Text style={[
            styles.statusText, 
            item.approval_status === 'approved' ? styles.approvedText : 
            item.approval_status === 'rejected' ? styles.rejectedText : 
            styles.pendingText
          ]}>
            {item.approval_status || 'pending'}
          </Text>
        </Text>
        {item.created_at && (
          <Text style={styles.vendorDetail}>
            Registered: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        )}
        {item.profile_info && (
          <View style={styles.profileInfo}>
            <Text style={styles.profileInfoTitle}>Business Information:</Text>
            {item.profile_info.business_name && (
              <Text style={styles.profileInfoText}>
                Business: {item.profile_info.business_name}
              </Text>
            )}
            {item.profile_info.address && (
              <Text style={styles.profileInfoText}>
                Address: {item.profile_info.address}
              </Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        {(!item.approval_status || item.approval_status === 'pending' || item.approval_status === 'rejected') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
        )}
        
        {(!item.approval_status || item.approval_status === 'pending' || item.approval_status === 'approved') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
          >
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      {['pending', 'approved', 'rejected'].map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.filterTab,
            activeTab === tab && styles.activeFilterTab
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[
            styles.filterTabText,
            activeTab === tab && styles.activeFilterTabText
          ]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderHeaderButtons = () => (
    <View style={styles.headerButtons}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('UserListScreen')}
      >
        <Text style={styles.navButtonText}>User List</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('ProductListScreen')}
      >
        <Text style={styles.navButtonText}>Products</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('TransactionListScreen')}
      >
        <Text style={styles.navButtonText}>Transactions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('ProfileScreen')}
      >
        <Text style={styles.navButtonText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading vendors...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Vendor Approvals</Text>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', onPress: logout, style: 'destructive' }
                ]
              );
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        {renderHeaderButtons()}
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search vendors by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      
      {renderFilterTabs()}
      
      {filteredVendors.length > 0 ? (
        <FlatList
          data={filteredVendors}
          renderItem={renderVendorItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={loadVendors}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vendors found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? `No results matching "${searchQuery}"`
              : activeTab === 'pending'
                ? 'No pending vendor approvals'
                : activeTab === 'approved'
                  ? 'No approved vendors'
                  : 'No rejected vendors'}
          </Text>
          {searchQuery && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#ff5252'
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600'
  },
  headerButtons: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  navButtonText: {
    color: '#333',
    fontWeight: '500'
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#333'
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0'
  },
  activeFilterTab: {
    backgroundColor: '#4e9af1'
  },
  filterTabText: {
    fontWeight: '500',
    color: '#666'
  },
  activeFilterTabText: {
    color: '#fff'
  },
  listContainer: {
    padding: 16
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  vendorInfo: {
    marginBottom: 16
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  vendorEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  vendorDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6
  },
  statusText: {
    fontWeight: '600'
  },
  pendingText: {
    color: '#f0ad4e'
  },
  approvedText: {
    color: '#5cb85c'
  },
  rejectedText: {
    color: '#d9534f'
  },
  profileInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12
  },
  profileInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8
  },
  profileInfoText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  approveButton: {
    backgroundColor: '#5cb85c'
  },
  rejectButton: {
    backgroundColor: '#d9534f'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  clearSearchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4e9af1',
    borderRadius: 6
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '500'
  }
});

export default VendorApprovalScreen;
