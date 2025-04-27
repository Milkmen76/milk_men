import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  Image,
  Animated,
  Share,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const route = useRoute();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'subscriptions'
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [allProducts, setAllProducts] = useState({});
  
  // Animation values
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Main data loading effect
  useEffect(() => {
    loadData();
  }, [user]);

  // Check for orderId in route params when orders are loaded
  useEffect(() => {
    if (!loading && orders.length > 0 && route.params?.orderId) {
      console.log('Received orderId:', route.params.orderId);
      const orderToShow = orders.find(order => order.order_id === route.params.orderId);
      
      if (orderToShow) {
        console.log('Found order, showing details', orderToShow);
        handleViewOrderDetails(orderToShow);
        
        // Clear the parameter after handling it
        navigation.setParams({ orderId: undefined });
      } else {
        console.log('Order not found:', route.params.orderId);
      }
    }
  }, [orders, loading, route.params?.orderId]);

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
      
      // Load products
      const vendorProducts = await localData.getProductsByVendor(user.id);
      const productsMap = {};
      vendorProducts.forEach(product => {
        productsMap[product.product_id] = product;
      });
      setAllProducts(productsMap);
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

  const handleViewOrderDetails = (item) => {
    setSelectedItem(item);
    setDetailsModalVisible(true);
    
    // Start animation
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  const closeDetailsModal = () => {
    // Animate out
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDetailsModalVisible(false);
      setSelectedItem(null);
    });
  };
  
  const shareInvoice = async () => {
    if (!selectedItem) return;
    
    const customer = users[selectedItem.user_id] || {};
    const customerName = customer.name || 'Unknown Customer';
    
    // Prepare content for sharing
    let invoiceText = `INVOICE\n\n`;
    invoiceText += `Order #${selectedItem.order_id}\n`;
    invoiceText += `Date: ${formatDate(selectedItem.created_at || selectedItem.date)}\n`;
    invoiceText += `Customer: ${customerName}\n\n`;
    invoiceText += `Status: ${selectedItem.status?.toUpperCase()}\n\n`;
    
    // Add product details
    invoiceText += `ITEMS:\n`;
    if (Array.isArray(selectedItem.products)) {
      let total = 0;
      selectedItem.products.forEach((productId, index) => {
        const product = allProducts[productId];
        if (product) {
          const productTotal = product.price * (selectedItem.quantities?.[index] || 1);
          total += productTotal;
          invoiceText += `${product.name} - ₹${product.price.toFixed(2)} x ${selectedItem.quantities?.[index] || 1} = ₹${productTotal.toFixed(2)}\n`;
        }
      });
      invoiceText += `\nTotal: ₹${total.toFixed(2)}`;
    } else {
      invoiceText += `Total: ₹${parseFloat(selectedItem.total || 0).toFixed(2)}`;
    }
    
    try {
      await Share.share({
        message: invoiceText,
        title: `Invoice for Order #${selectedItem.order_id}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invoice');
    }
  };
  
  // Get product image from base64 or default
  const getProductImage = (productId) => {
    const product = allProducts[productId];
    if (product?.image_base64) {
      return { uri: `data:image/jpeg;base64,${product.image_base64}` };
    }
    return require('../../assets/milk-icon.png');
  };

  const renderOrderDetails = () => {
    if (!selectedItem) return null;
    
    const customer = users[selectedItem.user_id] || {};
    const customerName = customer.name || 'Unknown Customer';
    const customerAddress = customer.profile_info?.address || 'Address not available';
    const customerPhone = customer.profile_info?.phone || 'Phone not available';
    
    return (
      <ScrollView style={styles.detailsScrollView}>
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsOrderId}>Order #{selectedItem.order_id}</Text>
          <View style={[styles.detailsStatusBadge, { backgroundColor: getStatusColor(selectedItem.status) }]}>
            <Text style={styles.detailsStatusText}>{selectedItem.status?.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.detailsSection}>
          <Text style={styles.detailsSectionTitle}>Customer Information</Text>
          <View style={styles.customerDetailRow}>
            <Text style={styles.customerDetailLabel}>Name:</Text>
            <Text style={styles.customerDetailValue}>{customerName}</Text>
          </View>
          <View style={styles.customerDetailRow}>
            <Text style={styles.customerDetailLabel}>Phone:</Text>
            <Text style={styles.customerDetailValue}>{customerPhone}</Text>
          </View>
          <View style={styles.customerDetailRow}>
            <Text style={styles.customerDetailLabel}>Address:</Text>
            <Text style={styles.customerDetailValue}>{customerAddress}</Text>
          </View>
        </View>
        
        <View style={styles.detailsSection}>
          <Text style={styles.detailsSectionTitle}>Order Details</Text>
          <View style={styles.customerDetailRow}>
            <Text style={styles.customerDetailLabel}>Date:</Text>
            <Text style={styles.customerDetailValue}>{formatDate(selectedItem.created_at || selectedItem.date)}</Text>
          </View>
          <View style={styles.customerDetailRow}>
            <Text style={styles.customerDetailLabel}>Payment:</Text>
            <Text style={styles.customerDetailValue}>{selectedItem.payment_method || 'Cash on Delivery'}</Text>
          </View>
          <View style={styles.customerDetailRow}>
            <Text style={styles.customerDetailLabel}>Delivery Date:</Text>
            <Text style={styles.customerDetailValue}>{formatDate(selectedItem.delivery_date)}</Text>
          </View>
          <View style={styles.customerDetailRow}>
            <Text style={styles.customerDetailLabel}>Delivery Time:</Text>
            <Text style={styles.customerDetailValue}>{selectedItem.delivery_time || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.detailsSection}>
          <Text style={styles.detailsSectionTitle}>Items</Text>
          {Array.isArray(selectedItem.products) && selectedItem.products.map((productId, index) => {
            const product = allProducts[productId];
            if (!product) return null;
            
            const quantity = selectedItem.quantities?.[index] || 1;
            const itemTotal = product.price * quantity;
            
            return (
              <View key={`${productId}-${index}`} style={styles.productItem}>
                <Image 
                  source={getProductImage(productId)} 
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>₹{product.price.toFixed(2)} × {quantity}</Text>
                </View>
                <Text style={styles.productTotal}>₹{itemTotal.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
        
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Order Total</Text>
          <Text style={styles.totalAmount}>₹{parseFloat(selectedItem.total || 0).toFixed(2)}</Text>
        </View>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.detailsActionButton,
              (selectedItem.status === OrderStatus.DELIVERED || 
              selectedItem.status === OrderStatus.CANCELLED) && styles.disabledButton
            ]}
            onPress={() => {
              closeDetailsModal();
              handleOrderStatusChange(selectedItem.order_id, selectedItem.status);
            }}
            disabled={selectedItem.status === OrderStatus.DELIVERED || selectedItem.status === OrderStatus.CANCELLED}
          >
            <Text style={styles.detailsActionButtonText}>Update Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.invoiceButton}
            onPress={shareInvoice}
          >
            <Text style={styles.invoiceButtonText}>Share Invoice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
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
            onPress={() => handleViewOrderDetails(item)}
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
      {/* Order Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: modalAnimation,
                transform: [
                  {
                    translateY: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={closeDetailsModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {renderOrderDetails()}
          </Animated.View>
        </View>
      </Modal>
      
      <View style={styles.header}>
        <Text style={styles.title}>Order Management</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders by customer name or ID..."
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
            style={[styles.tabButton, activeTab === 'orders' && styles.activeTabButton]}
            onPress={() => setActiveTab('orders')}
          >
            <Text 
              style={[styles.tabButtonText, activeTab === 'orders' && styles.activeTabText]}
            >
              Orders
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'subscriptions' && styles.activeTabButton]}
            onPress={() => setActiveTab('subscriptions')}
          >
            <Text 
              style={[styles.tabButtonText, activeTab === 'subscriptions' && styles.activeTabText]}
            >
              Subscriptions
            </Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
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
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    height: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#555',
    fontWeight: 'bold',
  },
  detailsScrollView: {
    flex: 1,
    padding: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsOrderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsSection: {
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customerDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  customerDetailLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  customerDetailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  productTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4e9af1',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 40,
  },
  detailsActionButton: {
    flex: 1,
    backgroundColor: '#4e9af1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  detailsActionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  invoiceButton: {
    flex: 1,
    backgroundColor: '#5cb85c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  invoiceButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default OrderManagementScreen;
