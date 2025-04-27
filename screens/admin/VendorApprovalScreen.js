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
  Platform,
  StatusBar,
  Image
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
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
            {item.profile_info.phone && (
              <Text style={styles.profileInfoText}>
                Phone: {item.profile_info.phone}
              </Text>
            )}
          </View>
        )}
      </View>
      
      {/* Only show action buttons for pending vendors */}
      {(!item.approval_status || item.approval_status === 'pending') && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
          >
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filtersScrollView}>
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeTab === 'pending' && styles.activeFilterButton
          ]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[
            styles.filterButtonText,
            activeTab === 'pending' && styles.activeFilterText
          ]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeTab === 'approved' && styles.activeFilterButton
          ]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[
            styles.filterButtonText,
            activeTab === 'approved' && styles.activeFilterText
          ]}>Approved</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeTab === 'rejected' && styles.activeFilterButton
          ]}
          onPress={() => setActiveTab('rejected')}
        >
          <Text style={[
            styles.filterButtonText,
            activeTab === 'rejected' && styles.activeFilterText
          ]}>Rejected</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNavButtons = () => (
    <View style={styles.filtersScrollView}>
     
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading vendors...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Admin Dashboard</Text>
            <Text style={styles.businessName}>Vendor Approvals</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoContainer}
            onPress={() => navigation.navigate('ProfileTab')}
            activeOpacity={0.7}
          >
            <Image 
              source={require('../../assets/milk-icon.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
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
      
      {renderNavButtons()}
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
              ? 'No vendors match your search criteria'
              : `No ${activeTab} vendors available`}
          </Text>
          {searchQuery && (
            <TouchableOpacity 
              style={styles.btnAction}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.btnActionText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  logoContainer: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.RADIUS_ROUND,
    backgroundColor: '#f0f8ff'
  },
  logo: {
    width: scale(30),
    height: scale(30)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#666'
  },
  searchContainer: {
    padding: SIZES.PADDING_M,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  searchInput: {
    height: SIZES.INPUT_HEIGHT,
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_M,
    paddingHorizontal: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#333'
  },
  filtersScrollView: {
    backgroundColor: '#fff',
    marginBottom: 8,
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
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
    backgroundColor: '#f0f0f0'
  },
  activeFilterButton: {
    backgroundColor: '#4e9af1'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666'
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '500'
  },
  listContainer: {
    padding: 16,
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  vendorInfo: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 12,
    marginBottom: 12,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vendorEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  vendorDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontWeight: '600',
  },
  approvedText: {
    color: '#5cb85c',
  },
  rejectedText: {
    color: '#d9534f',
  },
  pendingText: {
    color: '#f0ad4e',
  },
  profileInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  profileInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  profileInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: '#5cb85c',
  },
  rejectButton: {
    backgroundColor: '#d9534f',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
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
  btnAction: {
    backgroundColor: '#4e9af1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: scale(120),
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
  btnActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default VendorApprovalScreen;
