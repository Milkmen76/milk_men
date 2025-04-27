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
  StatusBar
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
    <View style={styles.filterTabs}>
      <TouchableOpacity
        style={[
          styles.filterTab,
          activeTab === 'pending' && styles.activeFilterTab
        ]}
        onPress={() => setActiveTab('pending')}
      >
        <Text style={[
          styles.filterTabText,
          activeTab === 'pending' && styles.activeFilterTabText
        ]}>Pending</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterTab,
          activeTab === 'approved' && styles.activeFilterTab
        ]}
        onPress={() => setActiveTab('approved')}
      >
        <Text style={[
          styles.filterTabText,
          activeTab === 'approved' && styles.activeFilterTabText
        ]}>Approved</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterTab,
          activeTab === 'rejected' && styles.activeFilterTab
        ]}
        onPress={() => setActiveTab('rejected')}
      >
        <Text style={[
          styles.filterTabText,
          activeTab === 'rejected' && styles.activeFilterTabText
        ]}>Rejected</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4e9af1" />
            <Text style={styles.loadingText}>Loading vendors...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
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
            keyExtractor={item => item.id}
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, 
    backgroundColor: '#f5f7fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    color: '#666'
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_M,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2)
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M
  },
  title: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333'
  },
  signOutButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#ff5252',
    minHeight: verticalScale(30),
    justifyContent: 'center',
    alignItems: 'center'
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.CAPTION
  },
  headerButtons: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.PADDING_S,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  navButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    marginHorizontal: SIZES.PADDING_XS,
    marginBottom: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#f0f0f0',
    minHeight: verticalScale(32),
    minWidth: scale(80),
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadowStyles(1)
  },
  navButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
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
    borderRadius: SIZES.RADIUS_S,
    paddingHorizontal: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#333'
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_S,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(1)
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SIZES.PADDING_XS,
    marginHorizontal: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#f0f0f0',
    minHeight: verticalScale(36),
    justifyContent: 'center'
  },
  activeFilterTab: {
    backgroundColor: '#4e9af1'
  },
  filterTabText: {
    fontWeight: '500',
    color: '#666',
    fontSize: SIZES.CAPTION
  },
  activeFilterTabText: {
    color: '#fff'
  },
  listContainer: {
    padding: SIZES.PADDING_M
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    ...getShadowStyles(3)
  },
  vendorInfo: {
    marginBottom: SIZES.PADDING_M
  },
  vendorName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS
  },
  vendorEmail: {
    fontSize: SIZES.BODY,
    color: '#666',
    marginBottom: SIZES.PADDING_M
  },
  vendorDetail: {
    fontSize: SIZES.BODY,
    color: '#555',
    marginBottom: SIZES.PADDING_XS
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
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    marginTop: SIZES.PADDING_M
  },
  profileInfoTitle: {
    fontSize: SIZES.BODY,
    fontWeight: '600',
    color: '#444',
    marginBottom: SIZES.PADDING_S
  },
  profileInfoText: {
    fontSize: SIZES.CAPTION,
    color: '#555',
    marginBottom: SIZES.PADDING_XS
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionButton: {
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    marginLeft: SIZES.PADDING_S,
    minHeight: verticalScale(36),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: scale(80),
    ...getShadowStyles(2)
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
    fontSize: SIZES.CAPTION
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_L
  },
  emptyText: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S
  },
  emptySubtext: {
    fontSize: SIZES.BODY,
    color: '#666',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_M
  },
  clearSearchButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    backgroundColor: '#4e9af1',
    borderRadius: SIZES.RADIUS_S,
    minHeight: SIZES.BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadowStyles(2)
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: SIZES.BODY
  }
});

export default VendorApprovalScreen;
