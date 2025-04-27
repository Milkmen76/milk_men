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
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as localData from '../../services/localData';

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

const VendorListScreen = () => {
  const navigation = useNavigation();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'subscribed'

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
    if (activeTab === 'all') {
      return vendors;
    } else {
      // This would filter subscribed vendors - for now returning all as example
      // In a real app, you would check which vendors the user is subscribed to
      return vendors.filter((_, index) => index % 2 === 0); // Just an example filter
    }
  };

  const renderVendorItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.vendorCard}
      onPress={() => navigation.navigate('ProductList', { vendorId: item.id })}
    >
      <View style={styles.vendorImageContainer}>
        <Image 
          source={require('../../assets/milk-icon.png')}
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
        <Text style={styles.headerTitle}>Available Milk Vendors</Text>
        
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
        
        {filteredVendors().length > 0 ? (
          <FlatList
            data={filteredVendors()}
            renderItem={renderVendorItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No vendors available at the moment</Text>
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
    padding: SIZES.PADDING_M 
  },
  headerTitle: { 
    fontSize: SIZES.TITLE, 
    fontWeight: 'bold',
    marginBottom: SIZES.PADDING_S,
    color: '#333'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    ...getShadowStyles(1),
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
    textAlign: 'center'
  }
});

export default VendorListScreen;
