import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as localData from '../../services/localData';

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

// Helper function to get vendor image
const getVendorImage = (vendor) => {
  console.log(`Getting image for vendor: ${vendor.profile_info?.business_name || 'Unknown'}`);
  
  if (vendor.profile_info?.logo_base64) {
    console.log(`Using base64 logo, data length: ${vendor.profile_info.logo_base64.length}`);
    return { uri: `data:image/jpeg;base64,${vendor.profile_info.logo_base64}` };
  }
  
  console.log(`Using fallback logo`);
  return require('../../assets/milk-icon.png');
};

const VendorListScreen = () => {
  const navigation = useNavigation();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'subscribed'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      // Fetch all users, then filter for approved vendors
      const allUsers = await localData.getUsers();
      const approvedVendors = allUsers.filter(
        u => u.role === 'vendor' && u.approval_status === 'approved'
      );
      setVendors(approvedVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = () => {
    let filtered = vendors;
    
    if (activeTab === 'subscribed') {
      // This would filter subscribed vendors - for now returning all as example
      // In a real app, you would check which vendors the user is subscribed to
      filtered = vendors.filter((_, index) => index % 2 === 0); // Just an example filter
    }
    
    // Apply search if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vendor => {
        const businessName = vendor.profile_info?.business_name?.toLowerCase() || '';
        const address = vendor.profile_info?.address?.toLowerCase() || '';
        return businessName.includes(query) || address.includes(query);
      });
    }
    
    return filtered;
  };

  const renderVendorItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.vendorCard}
      onPress={() => navigation.navigate('ProductList', { vendorId: item.id })}
    >
      <View style={styles.vendorImageContainer}>
        <Image 
          source={getVendorImage(item)}
          style={styles.vendorImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{item.profile_info?.business_name || 'Milk Vendor'}</Text>
        <Text style={styles.vendorAddress}>{item.profile_info?.address || 'No address provided'}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProductList', { vendorId: item.id })}
          >
            <Text style={styles.actionButtonText}>View Products</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.subscribeButton]}
            onPress={() => navigation.navigate('SubscriptionScreen', { vendorId: item.id })}
          >
            <Text style={styles.actionButtonText}>Subscribe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading vendors...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Available Milk Vendors</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors by name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearch} 
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'all' && styles.activeTabButton]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'all' && styles.activeTabText]}>
                All Vendors
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'subscribed' && styles.activeTabButton]}
              onPress={() => setActiveTab('subscribed')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'subscribed' && styles.activeTabText]}>
                Subscribed
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {filteredVendors().length > 0 ? (
          <FlatList
            data={filteredVendors()}
            renderItem={renderVendorItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={fetchVendors}
            refreshing={loading}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No vendors available at the moment</Text>
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.showAllText}>Clear search</Text>
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
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_S,
    ...getShadowStyles(2)
  },
  headerTitle: { 
    fontSize: SIZES.TITLE, 
    fontWeight: 'bold',
    marginBottom: SIZES.PADDING_S,
    color: '#333'
  },
  searchContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_S,
    marginBottom: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_S,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    height: verticalScale(40),
    flex: 1,
    fontSize: SIZES.BODY,
    paddingHorizontal: SIZES.PADDING_S,
  },
  clearSearch: {
    padding: SIZES.PADDING_XS,
  },
  clearSearchText: {
    color: '#999',
    fontSize: SIZES.BODY,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SIZES.PADDING_S,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTabButton: {
    borderBottomColor: '#4e9af1'
  },
  tabButtonText: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#666'
  },
  activeTabText: {
    color: '#4e9af1'
  },
  listContent: {
    padding: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_L
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_L,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    flexDirection: 'row',
    ...getShadowStyles(2)
  },
  vendorImageContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: SIZES.RADIUS_S,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_S
  },
  vendorImage: {
    width: scale(60),
    height: scale(60)
  },
  vendorInfo: {
    flex: 1
  },
  vendorName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    marginBottom: SIZES.PADDING_XS,
    color: '#333'
  },
  vendorAddress: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_S
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2
  },
  subscribeButton: {
    backgroundColor: '#5bbda6'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa'
  },
  loadingText: {
    marginTop: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: verticalScale(100)
  },
  emptyText: {
    fontSize: SIZES.BODY,
    color: '#666',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_S
  },
  showAllText: {
    fontSize: SIZES.CAPTION,
    color: '#4e9af1',
    fontWeight: '500'
  }
});

export default VendorListScreen;
