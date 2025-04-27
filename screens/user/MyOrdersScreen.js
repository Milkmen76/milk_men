import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  TextInput,
  Image,
  Animated,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

const MyOrdersScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    loadUserData();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, orders, subscriptions]);
  
  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load user's orders
      const userOrders = await localData.getOrdersByUser(user.id);
      // Sort orders by date (newest first)
      const sortedOrders = userOrders.sort((a, b) => 
        new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
      );
      setOrders(sortedOrders);
      
      // Load user's subscriptions
      const userSubscriptions = await localData.getSubscriptionsByUser(user.id);
      setSubscriptions(userSubscriptions);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };
  
  const applyFilters = () => {
    // Filter orders
    let filteredOrdersList = [...orders];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredOrdersList = filteredOrdersList.filter(order => 
        order.order_id.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
      );
    }
    setFilteredOrders(filteredOrdersList);
    
    // Filter subscriptions
    let filteredSubscriptionsList = [...subscriptions];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredSubscriptionsList = filteredSubscriptionsList.filter(sub => 
        (sub.subscription_id && sub.subscription_id.toLowerCase().includes(query)) ||
        (sub.status && sub.status.toLowerCase().includes(query)) ||
        (sub.type && sub.type.toLowerCase().includes(query))
      );
    }
    setFilteredSubscriptions(filteredSubscriptionsList);
  };
  
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
      case 'active':
        return '#5cb85c'; // green
      case 'processing':
        return '#5bc0de'; // blue
      case 'out for delivery':
        return '#4e9af1'; // primary blue
      case 'pending':
      case 'scheduled':
        return '#f0ad4e'; // orange
      case 'delayed':
      case 'paused':
        return '#fcbe03'; // yellow
      case 'cancelled':
      case 'skipped':
        return '#d9534f'; // red
      default:
        return '#777'; // gray
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getOrderProgress = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 0.25;
      case 'processing':
        return 0.5;
      case 'out for delivery':
        return 0.75;
      case 'delivered':
      case 'completed':
        return 1;
      default:
        return 0;
    }
  };
  
  const renderOrderItem = ({ item, index }) => {
    const progress = getOrderProgress(item.status);
    
    // Individual item animations
    const itemFadeAnim = useRef(new Animated.Value(0)).current;
    const itemSlideAnim = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
      const delay = index * 80; // Stagger the animations
      
      Animated.parallel([
        Animated.timing(itemFadeAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true
        }),
        Animated.timing(itemSlideAnim, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true
        })
      ]).start();
    }, []);
    
    return (
      <Animated.View
        style={[
          styles.orderItemContainer,
          {
            opacity: itemFadeAnim,
            transform: [{ translateY: itemSlideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.orderItem}
          onPress={() => navigation.navigate('OrderDetails', { orderId: item.order_id })}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeader}>
            <Text style={styles.orderIdText}>Order #{item.order_id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.orderMeta}>
            <Text style={styles.dateText}>Ordered on {formatDate(item.created_at || item.date)}</Text>
            <Text style={styles.amountText}>₹{parseFloat(item.total || 0).toFixed(2)}</Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, progress >= 0.25 ? styles.activeLabel : {}]}>
                Ordered
              </Text>
              <Text style={[styles.progressLabel, progress >= 0.5 ? styles.activeLabel : {}]}>
                Processing
              </Text>
              <Text style={[styles.progressLabel, progress >= 0.75 ? styles.activeLabel : {}]}>
                Shipping
              </Text>
              <Text style={[styles.progressLabel, progress >= 1 ? styles.activeLabel : {}]}>
                Delivered
              </Text>
            </View>
          </View>
          
          <View style={styles.orderFooter}>
            <Text style={styles.itemsText}>
              {Array.isArray(item.products) ? item.products.length : 0} items
            </Text>
            
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  const renderSubscriptionItem = ({ item, index }) => {
    // Individual item animations
    const itemFadeAnim = useRef(new Animated.Value(0)).current;
    const itemSlideAnim = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
      const delay = index * 80; // Stagger the animations
      
      Animated.parallel([
        Animated.timing(itemFadeAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true
        }),
        Animated.timing(itemSlideAnim, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true
        })
      ]).start();
    }, []);
    
    return (
      <Animated.View
        style={[
          styles.subscriptionItemContainer,
          {
            opacity: itemFadeAnim,
            transform: [{ translateY: itemSlideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.subscriptionItem}
          onPress={() => navigation.navigate('SubscriptionDetails', { subscriptionId: item.subscription_id })}
          activeOpacity={0.7}
        >
          <View style={styles.subscriptionHeader}>
            <Text style={styles.subscriptionIdText}>
              {item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Unknown'} Subscription
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status?.toUpperCase() || 'ACTIVE'}</Text>
            </View>
          </View>
          
          <View style={styles.subscriptionDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Start Date:</Text>
              <Text style={styles.detailValue}>{formatDate(item.start_date)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>End Date:</Text>
              <Text style={styles.detailValue}>{formatDate(item.end_date)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Delivery:</Text>
              <Text style={styles.detailValue}>
                {item.preferred_day || 'Daily'} ({item.delivery_time || 'Morning'})
              </Text>
            </View>
          </View>
          
          <View style={styles.subscriptionFooter}>
            {item.status === 'active' ? (
              <TouchableOpacity style={styles.pauseButton}>
                <Text style={styles.pauseButtonText}>Pause Subscription</Text>
              </TouchableOpacity>
            ) : item.status === 'paused' ? (
              <TouchableOpacity style={styles.resumeButton}>
                <Text style={styles.resumeButtonText}>Resume Subscription</Text>
              </TouchableOpacity>
            ) : null}
            
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
          
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>
        
        <View style={styles.tabContainer}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
              onPress={() => setActiveTab('orders')}
            >
              <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
                Orders
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'subscriptions' && styles.activeTab]}
              onPress={() => setActiveTab('subscriptions')}
            >
              <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.activeTabText]}>
                Subscriptions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {activeTab === 'orders' ? (
          filteredOrders.length > 0 ? (
            <FlatList
              data={filteredOrders}
              renderItem={renderOrderItem}
              keyExtractor={item => item.order_id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#4e9af1']}
                  tintColor="#4e9af1"
                />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/empty-orders.png')}
                style={styles.emptyImage}
              />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyText}>
                You haven't placed any orders yet.
              </Text>
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => navigation.navigate('UserHome')}
              >
                <Text style={styles.shopButtonText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          filteredSubscriptions.length > 0 ? (
            <FlatList
              data={filteredSubscriptions}
              renderItem={renderSubscriptionItem}
              keyExtractor={item => item.subscription_id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#4e9af1']}
                  tintColor="#4e9af1"
                />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/empty-subscriptions.png')}
                style={styles.emptyImage}
              />
              <Text style={styles.emptyTitle}>No Subscriptions Found</Text>
              <Text style={styles.emptyText}>
                You don't have any active subscriptions.
              </Text>
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => navigation.navigate('UserHome')}
              >
                <Text style={styles.shopButtonText}>Subscribe Now</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </Animated.View>
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
  content: {
    flex: 1,
  },
  header: {
    padding: SIZES.PADDING_M,
    backgroundColor: '#fff',
    ...getShadowStyles(2),
  },
  headerTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S,
  },
  searchBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_S,
    paddingHorizontal: SIZES.PADDING_S,
    height: scale(44),
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: SIZES.BODY,
    color: '#333',
  },
  tabContainer: {
    backgroundColor: '#fff',
    marginTop: SIZES.PADDING_XS,
    ...getShadowStyles(1),
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.PADDING_S,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4e9af1',
  },
  tabText: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#4e9af1',
  },
  listContent: {
    padding: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_XL,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_XL,
  },
  emptyImage: {
    width: scale(100),
    height: scale(100),
    marginBottom: SIZES.PADDING_M,
    opacity: 0.5,
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
    marginBottom: SIZES.PADDING_L,
  },
  shopButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_L,
    borderRadius: SIZES.RADIUS_S,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: SIZES.BODY,
    fontWeight: '600',
  },
  orderItemContainer: {
    marginBottom: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    overflow: 'hidden',
    ...getShadowStyles(2),
  },
  orderItem: {
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_S,
  },
  orderIdText: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: SIZES.PADDING_S,
    paddingVertical: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_ROUND,
  },
  statusText: {
    fontSize: SIZES.MINI,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.PADDING_M,
  },
  dateText: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  amountText: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    marginBottom: SIZES.PADDING_M,
  },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: '#f0f0f0',
    borderRadius: SIZES.RADIUS_XS,
    marginBottom: SIZES.PADDING_XS,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4e9af1',
    borderRadius: SIZES.RADIUS_XS,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: SIZES.MINI,
    color: '#999',
    width: '25%',
    textAlign: 'center',
  },
  activeLabel: {
    color: '#4e9af1',
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.PADDING_S,
    paddingTop: SIZES.PADDING_M,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemsText: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  footerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: SIZES.CAPTION,
  },
  subscriptionItemContainer: {
    marginBottom: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    overflow: 'hidden',
    ...getShadowStyles(2),
  },
  subscriptionItem: {
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_M,
  },
  subscriptionIdText: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
  },
  subscriptionDetails: {
    backgroundColor: '#f9f9f9',
    padding: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    marginBottom: SIZES.PADDING_M,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: SIZES.PADDING_XS,
  },
  detailLabel: {
    width: scale(90),
    fontSize: SIZES.CAPTION,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: SIZES.CAPTION,
    color: '#333',
  },
  subscriptionFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: SIZES.PADDING_M,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#fcbe03',
    paddingVertical: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    marginRight: SIZES.PADDING_XS,
    alignItems: 'center',
  },
  pauseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.CAPTION,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#5cb85c',
    paddingVertical: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    marginRight: SIZES.PADDING_XS,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.CAPTION,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: SIZES.CAPTION,
  },
});

export default MyOrdersScreen; 