import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Animated,
  Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as localData from '../../services/localData';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

const MyOrdersScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState(null);
  const [showEmptyAnimation] = useState(new Animated.Value(0));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get user ID from AsyncStorage on component mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUserId(parsedUser.id);
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    };

    getUserId();
  }, []);

  // Load orders and subscriptions when userId changes
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Load orders
      const allOrders = await localData.getOrders();
      const userOrders = allOrders.filter(order => order.user_id === userId);
      setOrders(userOrders);
      
      // Load subscriptions
      const allSubscriptions = await localData.getSubscriptions();
      const userSubscriptions = allSubscriptions.filter(
        subscription => subscription.user_id === userId
      );
      setSubscriptions(userSubscriptions);
      
      // Animate empty state if no data
      if (userOrders.length === 0 && userSubscriptions.length === 0) {
        Animated.timing(showEmptyAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const filterItems = (data) => {
    if (!searchQuery.trim()) return data;
    
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    
    return data.filter(item => {
      // Check order_id
      if (item.order_id && item.order_id.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check subscription_id
      if (item.subscription_id && item.subscription_id.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check status
      if (item.status && item.status.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check date
      if (item.created_at && item.created_at.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check vendor name if available
      if (item.vendor_name && item.vendor_name.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      return false;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return '#4CAF50';
      case 'out for delivery':
        return '#2196F3';
      case 'processing':
        return '#FF9800';
      case 'pending':
        return '#FFC107';
      case 'cancelled':
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getSubscriptionStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    
    switch (status.toLowerCase()) {
      case 'active':
        return '#4CAF50';
      case 'paused':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getFrequencyText = (frequency) => {
    if (!frequency) return 'N/A';
    
    const frequencyParts = frequency.split(' ');
    return frequencyParts.join(' ');
  };

  const renderOrderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('OrderDetailScreen', { orderId: item.order_id })}
      >
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Order #{item.order_id}</Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardContentText}>
            Total Amount: ₹{parseFloat(item.total || 0).toFixed(2)}
          </Text>
          
          {Array.isArray(item.products) && (
            <Text style={styles.itemsText}>
              {item.products.length} {item.products.length === 1 ? 'item' : 'items'}
            </Text>
          )}
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => navigation.navigate('OrderDetailScreen', { orderId: item.order_id })}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSubscriptionItem = ({ item }) => {
    const statusColor = getSubscriptionStatusColor(item.status);
    
    return (
      <View style={styles.itemCard}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>Subscription #{item.subscription_id}</Text>
              <Text style={styles.date}>{formatDate(item.start_date)}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.product_name}</Text>
            <Text style={styles.frequency}>
              {getFrequencyText(item.frequency)}
            </Text>
          </View>
          
          <View style={styles.cardActions}>
            <Text style={styles.price}>${(+item.price).toFixed(2)}</Text>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => navigation.navigate('SubscriptionDetailScreen', { subscriptionId: item.subscription_id })}
            >
              <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    const filteredData = activeTab === 'orders' 
      ? filterItems(orders) 
      : filterItems(subscriptions);
    
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.emptyText}>Loading your {activeTab}...</Text>
        </View>
      );
    }
    
    if (searchQuery && filteredData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <FontAwesome name="search" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No {activeTab} match your search</Text>
          <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (activeTab === 'orders' && orders.length === 0) {
      return (
        <Animated.View 
          style={[
            styles.emptyContainer, 
            { opacity: showEmptyAnimation }
          ]}
        >
          <Image 
            source={require('../../assets/empty-orders.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptyText}>Your order history will appear here</Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => navigation.navigate('VendorListScreen')}
          >
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }
    
    if (activeTab === 'subscriptions' && subscriptions.length === 0) {
      return (
        <Animated.View 
          style={[
            styles.emptyContainer, 
            { opacity: showEmptyAnimation }
          ]}
        >
          <Image 
            source={require('../../assets/empty-subscription.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No Subscriptions Yet</Text>
          <Text style={styles.emptyText}>Subscribe to regular milk delivery</Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => navigation.navigate('VendorListScreen')}
          >
            <Text style={styles.shopNowText}>Browse Vendors</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }
    
    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My {activeTab === 'orders' ? 'Orders' : 'Subscriptions'}</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'orders' && styles.activeTab]}
            onPress={() => setActiveTab('orders')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'orders' && styles.activeTabText
              ]}
            >
              Orders
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'subscriptions' && styles.activeTab]}
            onPress={() => setActiveTab('subscriptions')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'subscriptions' && styles.activeTabText
              ]}
            >
              Subscriptions
            </Text>
          </TouchableOpacity>
        </View>
        
        {activeTab === 'orders' ? (
          <FlatList
            data={filterItems(orders)}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.order_id || String(Math.random())}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
          />
        ) : (
          <FlatList
            data={filterItems(subscriptions)}
            renderItem={renderSubscriptionItem}
            keyExtractor={(item) => item.subscription_id || String(Math.random())}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
          />
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
    paddingVertical: SIZES.PADDING_M,
    paddingHorizontal: SIZES.PADDING_L,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    ...getShadowStyles(2),
  },
  headerTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_S,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_M,
    paddingHorizontal: SIZES.PADDING_S,
  },
  searchIcon: {
    marginRight: SIZES.PADDING_XS,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    color: '#333',
  },
  clearButton: {
    padding: SIZES.PADDING_XS,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_S,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: SIZES.PADDING_S,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4e9af1',
  },
  tabButtonText: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#4e9af1',
    fontWeight: 'bold',
  },
  listContent: {
    padding: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_XL + SIZES.PADDING_L,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
    flexDirection: 'row',
  },
  statusIndicator: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    flex: 1,
    paddingLeft: 10,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  date: {
    fontSize: SIZES.SMALL,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: SIZES.SMALL,
    color: '#666',
    marginRight: SIZES.PADDING_XS,
  },
  cardContent: {
    padding: SIZES.PADDING_M,
  },
  cardContentText: {
    fontSize: SIZES.BODY,
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  itemsText: {
    fontSize: SIZES.SMALL,
    color: '#666',
  },
  dateContainer: {
    flexDirection: 'row',
    marginBottom: SIZES.PADDING_XS,
  },
  dateLabel: {
    fontSize: SIZES.BODY,
    color: '#666',
    width: scale(100),
  },
  dateValue: {
    fontSize: SIZES.BODY,
    color: '#333',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: SIZES.PADDING_S,
  },
  viewDetailsButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SIZES.PADDING_XS,
  },
  viewDetailsText: {
    color: '#4e9af1',
    fontSize: SIZES.BODY,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.PADDING_L,
    paddingVertical: SIZES.PADDING_XL * 2,
  },
  emptyImage: {
    width: scale(150),
    height: scale(150),
    marginBottom: SIZES.PADDING_M,
  },
  emptyTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S,
  },
  emptyText: {
    fontSize: SIZES.BODY,
    color: '#666',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_M,
  },
  shopNowButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_L,
    borderRadius: SIZES.RADIUS_M,
    ...getShadowStyles(1),
  },
  shopNowText: {
    color: '#fff',
    fontSize: SIZES.BODY,
    fontWeight: '600',
  },
  clearSearchButton: {
    marginTop: SIZES.PADDING_S,
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    backgroundColor: '#f0f0f0',
    borderRadius: SIZES.RADIUS_S,
  },
  clearSearchText: {
    color: '#666',
    fontSize: SIZES.SMALL,
  },
  productInfo: {
    marginBottom: 10,
  },
  productName: {
    fontSize: SIZES.BODY,
    fontWeight: '600',
    marginBottom: 5,
  },
  frequency: {
    fontSize: SIZES.SMALL,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  price: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  detailsButtonText: {
    fontSize: SIZES.SMALL,
    color: '#333',
    fontWeight: '500',
  },
});

export default MyOrdersScreen; 