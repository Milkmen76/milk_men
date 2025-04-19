import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Animated,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

const OrdersScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Status filters
  const statusFilters = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    loadOrders();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      applyFilters();
    }
  }, [activeFilter, searchQuery, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      if (!user || !user.id) {
        console.error('No user found or user ID is missing');
        setLoading(false);
        return;
      }

      // Fetch orders for the vendor
      const vendorOrders = await localData.getOrdersByVendor(user.id);
      
      // Sort orders by date (newest first)
      const sortedOrders = vendorOrders.sort((a, b) => {
        return new Date(b.order_date) - new Date(a.order_date);
      });
      
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
      
      console.log(`Loaded ${sortedOrders.length} orders for vendor ${user.id}`);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const applyFilters = () => {
    let result = [...orders];
    
    // Apply status filter
    if (activeFilter !== 'all') {
      result = result.filter(order => order.status.toLowerCase() === activeFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.order_id.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.address?.toLowerCase().includes(query)
      );
    }
    
    setFilteredOrders(result);
  };

  const handleOrderPress = (order) => {
    navigation.navigate('OrderManagement', { orderId: order.order_id });
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: '#FEF9C3', text: '#CA8A04' }; // Yellow
      case 'processing':
        return { bg: '#E0F2FE', text: '#0284C7' }; // Blue
      case 'delivering':
        return { bg: '#E0F2FE', text: '#0284C7' }; // Blue
      case 'delivered':
        return { bg: '#DCFCE7', text: '#16A34A' }; // Green
      case 'completed':
        return { bg: '#DCFCE7', text: '#16A34A' }; // Green
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#DC2626' }; // Red
      default:
        return { bg: '#F3F4F6', text: '#6B7280' }; // Gray
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };
  
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const renderOrderItem = ({ item, index }) => {
    const statusStyle = getStatusColor(item.status);
    const isEven = index % 2 === 0;
    
    // Individual item animations
    const itemFadeAnim = useRef(new Animated.Value(0)).current;
    const itemSlideAnim = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
      const delay = index * 50; // Stagger the animations
      
      Animated.parallel([
        Animated.timing(itemFadeAnim, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true
        }),
        Animated.timing(itemSlideAnim, {
          toValue: 0,
          duration: 300,
          delay,
          useNativeDriver: true
        })
      ]).start();
    }, []);
    
    return (
      <Animated.View 
        style={[
          styles.orderItemContainer,
          isEven ? styles.evenRow : styles.oddRow,
          {
            opacity: itemFadeAnim,
            transform: [{ translateY: itemSlideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.orderItem}
          onPress={() => handleOrderPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderIdText}>Order #{item.order_id.slice(-6)}</Text>
              <Text style={styles.dateText}>
                {formatDate(item.order_date)} at {formatTime(item.order_date)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.customerInfo}>
            <Icon name="account" size={16} color="#666" style={styles.infoIcon} />
            <Text style={styles.customerName}>{item.customer_name || 'Unknown Customer'}</Text>
          </View>

          {item.address && (
            <View style={styles.addressInfo}>
              <Icon name="map-marker" size={16} color="#666" style={styles.infoIcon} />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          <View style={styles.orderFooter}>
            <View style={styles.productCount}>
              <Text style={styles.productCountText}>
                {item.products?.length || 0} {item.products?.length === 1 ? 'product' : 'products'}
              </Text>
            </View>
            <Text style={styles.totalAmount}>{formatCurrency(item.total_amount)}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFilterItem = ({ item }) => {
    const isActive = activeFilter === item.key;
    
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => setActiveFilter(item.key)}
      >
        <Text style={[styles.filterButtonText, isActive && styles.activeFilterText]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        <FlatList
          horizontal
          data={statusFilters}
          renderItem={renderFilterItem}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
          contentContainerStyle={styles.filterContainer}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4e9af1" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="clipboard-text-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim() !== '' || activeFilter !== 'all'
                ? 'Try changing your search or filter criteria'
                : 'You currently have no orders to display'}
            </Text>
            {searchQuery.trim() !== '' || activeFilter !== 'all' ? (
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.order_id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.orderList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4e9af1']}
                tintColor="#4e9af1"
              />
            }
          />
        )}

        <View style={styles.summaryFooter}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryCount}>{filteredOrders.length}</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryCount}>
              {filteredOrders.filter(order => 
                order.status.toLowerCase() === 'pending' || 
                order.status.toLowerCase() === 'processing'
              ).length}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryCount}>
              {filteredOrders.filter(order => 
                order.status.toLowerCase() === 'delivered' || 
                order.status.toLowerCase() === 'completed'
              ).length}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#333',
  },
  filterList: {
    backgroundColor: '#fff',
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
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  activeFilterButton: {
    backgroundColor: '#4e9af1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  orderList: {
    padding: 12,
    paddingBottom: 80, // Extra space for the footer
  },
  orderItemContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
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
  orderItem: {
    backgroundColor: '#fff',
    padding: 16,
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#fff',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 6,
  },
  customerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  productCount: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productCountText: {
    fontSize: 12,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4e9af1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4e9af1',
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  summaryFooter: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default OrdersScreen; 