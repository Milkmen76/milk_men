import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  TextInput,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const OrderStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  OUT_FOR_DELIVERY: 'out for delivery',
  DELIVERED: 'delivered',
  DELAYED: 'delayed',
  CANCELLED: 'cancelled'
};

const SubscriptionStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const DeliveryStatus = {
  SCHEDULED: 'scheduled',
  OUT_FOR_DELIVERY: 'out for delivery',
  DELIVERED: 'delivered',
  DELAYED: 'delayed',
  SKIPPED: 'skipped'
};

const OrderManagementScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'subscriptions'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      
      // Load orders for this vendor
      const allOrders = await localData.getOrdersByVendor(user.id);
      setOrders(allOrders);
      
      // Load subscriptions for this vendor
      const allSubscriptions = await localData.getSubscriptionsByVendor(user.id);
      setSubscriptions(allSubscriptions);
      
      // Load users for mapping customer names
      const allUsers = await localData.getUsers();
      const usersMap = {};
      allUsers.forEach(user => {
        usersMap[user.id] = user;
      });
      setUsers(usersMap);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredOrders = () => {
    let filtered = orders;
    
    // Apply status filter if not 'all'
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(order => order.status === selectedFilter);
    }
    
    // Apply search filter if there is a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const customerName = users[order.user_id]?.name?.toLowerCase() || '';
        const orderId = order.order_id?.toLowerCase() || '';
        return customerName.includes(query) || orderId.includes(query);
      });
    }
    
    return filtered;
  };

  const filteredSubscriptions = () => {
    let filtered = subscriptions;
    
    // Apply status filter if not 'all'
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === selectedFilter);
    }
    
    // Apply search filter if there is a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sub => {
        const customerName = users[sub.user_id]?.name?.toLowerCase() || '';
        const subId = sub.subscription_id?.toLowerCase() || '';
        return customerName.includes(query) || subId.includes(query);
      });
    }
    
    return filtered;
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setRefreshing(true);
      await localData.updateOrderStatus(orderId, newStatus);
      // Refresh the orders list
      loadData();
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setRefreshing(false);
    }
  };

  const updateSubscriptionStatus = async (subscriptionId, newStatus) => {
    try {
      setRefreshing(true);
      await localData.updateSubscriptionStatus(subscriptionId, newStatus);
      // Refresh the subscriptions list
      loadData();
      Alert.alert('Success', `Subscription status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating subscription status:', error);
      Alert.alert('Error', 'Failed to update subscription status');
    } finally {
      setRefreshing(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId, newStatus) => {
    try {
      setRefreshing(true);
      await localData.updateDeliveryStatus(deliveryId, newStatus);
      // Refresh the data
      loadData();
      Alert.alert('Success', `Delivery status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOrderStatusChange = (orderId, currentStatus) => {
    let options = [];
    
    // Determine available status options based on current status
    switch (currentStatus) {
      case OrderStatus.PENDING:
        options = [
          { label: 'Process', value: OrderStatus.PROCESSING },
          { label: 'Out for Delivery', value: OrderStatus.OUT_FOR_DELIVERY },
          { label: 'Cancel', value: OrderStatus.CANCELLED }
        ];
        break;
      case OrderStatus.PROCESSING:
        options = [
          { label: 'Out for Delivery', value: OrderStatus.OUT_FOR_DELIVERY },
          { label: 'Delayed', value: OrderStatus.DELAYED },
          { label: 'Cancel', value: OrderStatus.CANCELLED }
        ];
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        options = [
          { label: 'Mark as Delivered', value: OrderStatus.DELIVERED },
          { label: 'Delayed', value: OrderStatus.DELAYED },
          { label: 'Cancel', value: OrderStatus.CANCELLED }
        ];
        break;
      case OrderStatus.DELAYED:
        options = [
          { label: 'Resume Processing', value: OrderStatus.PROCESSING },
          { label: 'Out for Delivery', value: OrderStatus.OUT_FOR_DELIVERY },
          { label: 'Cancel', value: OrderStatus.CANCELLED }
        ];
        break;
      default:
        // If already delivered or cancelled, no further status changes
        Alert.alert('Info', 'This order is already in final status');
        return;
    }
    
    // Show options to the user
    Alert.alert(
      'Update Order Status',
      'Choose a new status:',
      [
        ...options.map(option => ({
          text: option.label,
          onPress: () => updateOrderStatus(orderId, option.value)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSubscriptionStatusChange = (subscriptionId, currentStatus) => {
    let options = [];
    
    // Determine available status options based on current status
    switch (currentStatus) {
      case SubscriptionStatus.ACTIVE:
        options = [
          { label: 'Pause Subscription', value: SubscriptionStatus.PAUSED },
          { label: 'Complete Subscription', value: SubscriptionStatus.COMPLETED },
          { label: 'Cancel Subscription', value: SubscriptionStatus.CANCELLED }
        ];
        break;
      case SubscriptionStatus.PAUSED:
        options = [
          { label: 'Reactivate', value: SubscriptionStatus.ACTIVE },
          { label: 'Cancel Subscription', value: SubscriptionStatus.CANCELLED }
        ];
        break;
      default:
        // If already completed or cancelled, no further status changes
        Alert.alert('Info', 'This subscription is already in final status');
        return;
    }
    
    // Show options to the user
    Alert.alert(
      'Update Subscription Status',
      'Choose a new status:',
      [
        ...options.map(option => ({
          text: option.label,
          onPress: () => updateSubscriptionStatus(subscriptionId, option.value)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleDeliveryStatusChange = (deliveryId, currentStatus) => {
    let options = [];
    
    // Determine available status options based on current status
    switch (currentStatus) {
      case DeliveryStatus.SCHEDULED:
        options = [
          { label: 'Out for Delivery', value: DeliveryStatus.OUT_FOR_DELIVERY },
          { label: 'Delayed', value: DeliveryStatus.DELAYED },
          { label: 'Skip Delivery', value: DeliveryStatus.SKIPPED }
        ];
        break;
      case DeliveryStatus.OUT_FOR_DELIVERY:
        options = [
          { label: 'Mark as Delivered', value: DeliveryStatus.DELIVERED },
          { label: 'Delayed', value: DeliveryStatus.DELAYED }
        ];
        break;
      case DeliveryStatus.DELAYED:
        options = [
          { label: 'Out for Delivery', value: DeliveryStatus.OUT_FOR_DELIVERY },
          { label: 'Skip Delivery', value: DeliveryStatus.SKIPPED }
        ];
        break;
      default:
        // If already delivered or skipped, no further status changes
        Alert.alert('Info', 'This delivery is already in final status');
        return;
    }
    
    // Show options to the user
    Alert.alert(
      'Update Delivery Status',
      'Choose a new status:',
      [
        ...options.map(option => ({
          text: option.label,
          onPress: () => updateDeliveryStatus(deliveryId, option.value)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case OrderStatus.DELIVERED:
      case SubscriptionStatus.ACTIVE:
      case DeliveryStatus.DELIVERED:
        return '#5cb85c'; // green
      case OrderStatus.PROCESSING:
        return '#5bc0de'; // blue
      case OrderStatus.OUT_FOR_DELIVERY:
      case DeliveryStatus.OUT_FOR_DELIVERY:
        return '#4e9af1'; // primary blue
      case OrderStatus.PENDING:
      case DeliveryStatus.SCHEDULED:
        return '#f0ad4e'; // orange
      case OrderStatus.DELAYED:
      case DeliveryStatus.DELAYED:
      case SubscriptionStatus.PAUSED:
        return '#fcbe03'; // yellow/amber
      case OrderStatus.CANCELLED:
      case SubscriptionStatus.CANCELLED:
      case DeliveryStatus.SKIPPED:
        return '#d9534f'; // red
      default:
        return '#777'; // gray
    }
  };

  const renderOrderItem = ({ item }) => {
    // Get customer name
    const customer = users[item.user_id] || {};
    const customerName = customer.name || 'Unknown Customer';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Order #{item.order_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer:</Text>
            <Text style={styles.detailValue}>{customerName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDate(item.created_at || item.date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Products:</Text>
            <Text style={styles.detailValue}>
              {Array.isArray(item.products) ? item.products.length : 'N/A'} items
            </Text>
          </View>
          
          {item.total && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total:</Text>
              <Text style={styles.detailValue}>₹{parseFloat(item.total).toFixed(2)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              (item.status === OrderStatus.DELIVERED || 
              item.status === OrderStatus.CANCELLED) && styles.disabledButton
            ]}
            onPress={() => handleOrderStatusChange(item.order_id, item.status)}
            disabled={item.status === OrderStatus.DELIVERED || item.status === OrderStatus.CANCELLED}
          >
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
              Alert.alert('Order Details', `View full details for order #${item.order_id}`);
              // In a real app, navigate to order details screen
            }}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSubscriptionItem = ({ item }) => {
    // Get customer name
    const customer = users[item.user_id] || {};
    const customerName = customer.name || 'Unknown Customer';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Subscription #{item.subscription_id?.slice(-5)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status?.toUpperCase() || 'ACTIVE'}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer:</Text>
            <Text style={styles.detailValue}>{customerName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>
              {item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Period:</Text>
            <Text style={styles.detailValue}>
              {formatDate(item.start_date).split(' ')[0]} to {formatDate(item.end_date).split(' ')[0]}
            </Text>
          </View>
          
          {item.delivery_time && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery:</Text>
              <Text style={styles.detailValue}>
                {item.preferred_day || 'Daily'} ({item.delivery_time})
              </Text>
            </View>
          )}
          
          {/* Upcoming delivery status */}
          <View style={styles.deliveryStatus}>
            <Text style={styles.deliveryTitle}>Next Delivery:</Text>
            <View style={[styles.deliveryBadge, { backgroundColor: getStatusColor(DeliveryStatus.SCHEDULED) }]}>
              <Text style={styles.deliveryText}>SCHEDULED</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              (item.status === SubscriptionStatus.COMPLETED || 
              item.status === SubscriptionStatus.CANCELLED) && styles.disabledButton
            ]}
            onPress={() => handleSubscriptionStatusChange(item.subscription_id, item.status || SubscriptionStatus.ACTIVE)}
            disabled={item.status === SubscriptionStatus.COMPLETED || item.status === SubscriptionStatus.CANCELLED}
          >
            <Text style={styles.actionButtonText}>Update Subscription</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deliveryButton}
            onPress={() => handleDeliveryStatusChange('delivery_' + item.subscription_id, DeliveryStatus.SCHEDULED)}
          >
            <Text style={styles.deliveryButtonText}>Update Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilterButtons = () => {
    // Get relevant status options based on active tab
    const statusOptions = activeTab === 'orders' 
      ? [
          { value: 'all', label: 'All' },
          { value: OrderStatus.PENDING, label: 'Pending' },
          { value: OrderStatus.PROCESSING, label: 'Processing' },
          { value: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
          { value: OrderStatus.DELAYED, label: 'Delayed' },
          { value: OrderStatus.DELIVERED, label: 'Delivered' },
          { value: OrderStatus.CANCELLED, label: 'Cancelled' }
        ]
      : [
          { value: 'all', label: 'All' },
          { value: SubscriptionStatus.ACTIVE, label: 'Active' },
          { value: SubscriptionStatus.PAUSED, label: 'Paused' },
          { value: SubscriptionStatus.COMPLETED, label: 'Completed' },
          { value: SubscriptionStatus.CANCELLED, label: 'Cancelled' }
        ];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScrollView}
      >
        <View style={styles.filtersContainer}>
          {statusOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                selectedFilter === option.value && styles.activeFilterButton
              ]}
              onPress={() => setSelectedFilter(option.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === option.value && styles.activeFilterText
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Deliveries</Text>
      </View>
      
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'orders' && styles.activeTabButton]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'orders' && styles.activeTabText]}>
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'subscriptions' && styles.activeTabButton]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'subscriptions' && styles.activeTabText]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      
      {renderFilterButtons()}
      
      {activeTab === 'orders' && (
        <>
          {filteredOrders().length > 0 ? (
            <FlatList
              data={filteredOrders()}
              renderItem={renderOrderItem}
              keyExtractor={(item) => item.order_id || Math.random().toString()}
              contentContainerStyle={styles.listContent}
              refreshing={refreshing}
              onRefresh={loadData}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders found</Text>
              {selectedFilter !== 'all' && (
                <Text style={styles.emptySubtext}>Try selecting a different filter</Text>
              )}
            </View>
          )}
        </>
      )}
      
      {activeTab === 'subscriptions' && (
        <>
          {filteredSubscriptions().length > 0 ? (
            <FlatList
              data={filteredSubscriptions()}
              renderItem={renderSubscriptionItem}
              keyExtractor={(item) => item.subscription_id || Math.random().toString()}
              contentContainerStyle={styles.listContent}
              refreshing={refreshing}
              onRefresh={loadData}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No subscriptions found</Text>
              {selectedFilter !== 'all' && (
                <Text style={styles.emptySubtext}>Try selecting a different filter</Text>
              )}
            </View>
          )}
        </>
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
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  tabs: {
    flexDirection: 'row',
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
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTabButton: {
    borderBottomColor: '#4e9af1'
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666'
  },
  activeTabText: {
    color: '#4e9af1'
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  searchInput: {
    height: 40,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15
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
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
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
  listContent: {
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  cardBody: {
    padding: 16
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  deliveryStatus: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8
  },
  deliveryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  deliveryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5'
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#4e9af1'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  disabledButton: {
    backgroundColor: '#e0e0e0'
  },
  viewButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f7fa'
  },
  viewButtonText: {
    color: '#666',
    fontWeight: '500'
  },
  deliveryButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#5cb85c'
  },
  deliveryButtonText: {
    color: '#fff',
    fontWeight: '600'
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
    textAlign: 'center'
  }
});

export default OrderManagementScreen;
