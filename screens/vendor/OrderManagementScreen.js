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
  Modal,
  RefreshControl
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [processingDeliveries, setProcessingDeliveries] = useState(false);
  const [vendorStatus, setVendorStatus] = useState('available'); // 'available' or 'unavailable'
  const [activeDeliveryCount, setActiveDeliveryCount] = useState(0);
  const [vacationSubscriptionsCount, setVacationSubscriptionsCount] = useState(0);
  
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
  
  // Enhanced shareInvoice function with delivery details
  const shareInvoice = async () => {
    if (!selectedItem) return;
    
    try {
      setLoading(true);
      
      // Get order details
      const orderData = selectedItem;
      
      // Get subscription details if it's a subscription delivery
      let subscriptionData = null;
      if (orderData.subscription_id) {
        subscriptionData = await localData.getSubscriptionById(orderData.subscription_id);
      }
      
      // Get customer details
      const customer = await localData.getUserById(orderData.user_id);
      
      // Get delivery history if exists
      const deliveries = await localData.getDeliveriesByOrder(orderData.order_id);
      
      // Get product details
      let productDetails = [];
      let totalAmount = 0;
      
      if (Array.isArray(orderData.products)) {
        const productPromises = orderData.products.map(async (productId, index) => {
          const product = await localData.getProductById(productId);
          if (product) {
            const quantity = orderData.quantities ? orderData.quantities[index] : 1;
            const amount = product.price * quantity;
            totalAmount += amount;
            
            return {
              name: product.name,
              price: product.price,
              quantity: quantity,
              amount: amount
            };
          }
          return null;
        });
        
        productDetails = (await Promise.all(productPromises)).filter(p => p !== null);
      }
      
      // Format date
      const formatInvoiceDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };
      
      // Generate invoice text
      const invoiceText = 
        `INVOICE\n` +
        `===================================\n\n` +
        `Order ID: ${orderData.order_id}\n` +
        `Date: ${formatInvoiceDate(orderData.created_at || orderData.date)}\n` +
        `Status: ${orderData.status.toUpperCase()}\n\n` +
        
        `CUSTOMER DETAILS\n` +
        `===================================\n` +
        `Name: ${customer?.name || 'N/A'}\n` +
        `Email: ${customer?.email || 'N/A'}\n` +
        `Address: ${orderData.delivery_address || customer?.profile_info?.address || 'N/A'}\n\n` +
        
        `${subscriptionData ? 'SUBSCRIPTION DETAILS\n' + 
        '===================================\n' +
        `Subscription ID: ${subscriptionData.subscription_id}\n` +
        `Type: ${subscriptionData.type}\n` +
        `Period: ${formatInvoiceDate(subscriptionData.start_date)} to ${formatInvoiceDate(subscriptionData.end_date)}\n\n` : ''}` +
        
        `PRODUCT DETAILS\n` +
        `===================================\n` +
        productDetails.map(p => `${p.name} (${p.quantity} x ₹${p.price.toFixed(2)}) = ₹${p.amount.toFixed(2)}`).join('\n') +
        `\n\n` +
        
        `DELIVERY DETAILS\n` +
        `===================================\n` +
        `Delivery Date: ${formatInvoiceDate(orderData.delivery_date)}\n` +
        `Delivery Time: ${orderData.delivery_time || 'N/A'}\n` +
        (deliveries && deliveries.length > 0 
          ? `Delivery Status: ${deliveries[0].status}\n` +
            `Delivered By: ${user.name}\n` +
            `Delivery Notes: ${deliveries[0].notes || 'None'}\n\n`
          : `\n`) +
        
        `PAYMENT DETAILS\n` +
        `===================================\n` +
        `Subtotal: ₹${totalAmount.toFixed(2)}\n` +
        `Delivery Fee: ₹0.00\n` +
        `Discount: ₹0.00\n` +
        `Total Amount: ₹${totalAmount.toFixed(2)}\n\n` +
        
        `Thank you for your business!\n` +
        `===================================\n` +
        `${user?.profile_info?.business_name || user?.name || 'Milk Delivery'}\n` +
        `Contact: ${user?.phone_number || user?.email || 'N/A'}`;
      
      // Generate HTML invoice for a more professional look
      const invoiceHtml = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #4e9af1; margin-bottom: 5px; }
            .section { margin-bottom: 20px; }
            .section-title { background-color: #4e9af1; color: white; padding: 5px 10px; font-weight: bold; }
            .row { display: flex; border-bottom: 1px solid #eee; padding: 8px 0; }
            .col-left { width: 40%; font-weight: bold; }
            .col-right { width: 60%; }
            .products { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .products th { background-color: #f5f5f5; padding: 8px; text-align: left; }
            .products td { padding: 8px; border-bottom: 1px solid #eee; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <p>Order #${orderData.order_id}</p>
          </div>
          
          <div class="section">
            <div class="section-title">ORDER INFORMATION</div>
            <div class="row">
              <div class="col-left">Date:</div>
              <div class="col-right">${formatInvoiceDate(orderData.created_at || orderData.date)}</div>
            </div>
            <div class="row">
              <div class="col-left">Status:</div>
              <div class="col-right">${orderData.status.toUpperCase()}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">CUSTOMER DETAILS</div>
            <div class="row">
              <div class="col-left">Name:</div>
              <div class="col-right">${customer?.name || 'N/A'}</div>
            </div>
            <div class="row">
              <div class="col-left">Email:</div>
              <div class="col-right">${customer?.email || 'N/A'}</div>
            </div>
            <div class="row">
              <div class="col-left">Address:</div>
              <div class="col-right">${orderData.delivery_address || customer?.profile_info?.address || 'N/A'}</div>
            </div>
          </div>
          
          ${subscriptionData ? `
          <div class="section">
            <div class="section-title">SUBSCRIPTION DETAILS</div>
            <div class="row">
              <div class="col-left">Subscription ID:</div>
              <div class="col-right">${subscriptionData.subscription_id}</div>
            </div>
            <div class="row">
              <div class="col-left">Type:</div>
              <div class="col-right">${subscriptionData.type}</div>
            </div>
            <div class="row">
              <div class="col-left">Period:</div>
              <div class="col-right">${formatInvoiceDate(subscriptionData.start_date)} to ${formatInvoiceDate(subscriptionData.end_date)}</div>
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">PRODUCT DETAILS</div>
            <table class="products">
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Amount</th>
              </tr>
              ${productDetails.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>₹${p.price.toFixed(2)}</td>
                  <td>${p.quantity}</td>
                  <td>₹${p.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">Total</td>
                <td>₹${totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <div class="section-title">DELIVERY DETAILS</div>
            <div class="row">
              <div class="col-left">Delivery Date:</div>
              <div class="col-right">${formatInvoiceDate(orderData.delivery_date)}</div>
            </div>
            <div class="row">
              <div class="col-left">Delivery Time:</div>
              <div class="col-right">${orderData.delivery_time || 'N/A'}</div>
            </div>
            ${deliveries && deliveries.length > 0 ? `
            <div class="row">
              <div class="col-left">Delivery Status:</div>
              <div class="col-right">${deliveries[0].status}</div>
            </div>
            <div class="row">
              <div class="col-left">Delivered By:</div>
              <div class="col-right">${user.name}</div>
            </div>
            <div class="row">
              <div class="col-left">Delivery Notes:</div>
              <div class="col-right">${deliveries[0].notes || 'None'}</div>
            </div>
            ` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">PAYMENT DETAILS</div>
            <div class="row">
              <div class="col-left">Subtotal:</div>
              <div class="col-right">₹${totalAmount.toFixed(2)}</div>
            </div>
            <div class="row">
              <div class="col-left">Delivery Fee:</div>
              <div class="col-right">₹0.00</div>
            </div>
            <div class="row">
              <div class="col-left">Discount:</div>
              <div class="col-right">₹0.00</div>
            </div>
            <div class="row total-row">
              <div class="col-left">Total Amount:</div>
              <div class="col-right">₹${totalAmount.toFixed(2)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>${user?.profile_info?.business_name || user?.name || 'Milk Delivery'}</p>
            <p>Contact: ${user?.phone_number || user?.email || 'N/A'}</p>
          </div>
        </body>
        </html>
      `;
      
      // Show invoice options
      Alert.alert(
        'Invoice Options',
        'Choose how you would like to share the invoice:',
        [
          {
            text: 'Share as Text',
            onPress: async () => {
              try {
                await Share.share({
                  message: invoiceText,
                  title: `Invoice #${orderData.order_id}`
                });
              } catch (error) {
                console.error('Error sharing invoice:', error);
                Alert.alert('Error', 'Failed to share invoice');
              }
            }
          },
          {
            text: 'Share as HTML',
            onPress: () => {
              Alert.alert(
                'HTML Invoice',
                'In a real app, this would create a PDF from the HTML or save to a file for sharing.',
                [{ text: 'OK' }]
              );
              
              // In a real app, you would use a library like react-native-html-to-pdf to convert HTML to PDF
              // and then share the PDF file
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    } finally {
      setLoading(false);
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
    
    // Check if subscription is on vacation
    const isOnVacation = item.vacation_mode && 
      new Date() >= new Date(item.vacation_start) && 
      new Date() <= new Date(item.vacation_end);
      
    // Set status display
    const displayStatus = isOnVacation ? 'On Vacation' : item.status;
    const statusColor = isOnVacation ? '#FF9800' : getStatusColor(item.status);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Subscription #{item.subscription_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{displayStatus.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer:</Text>
            <Text style={styles.detailValue}>{customerName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Date:</Text>
            <Text style={styles.detailValue}>{formatDate(item.start_date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date:</Text>
            <Text style={styles.detailValue}>{formatDate(item.end_date)}</Text>
          </View>
          
          {isOnVacation && (
            <View style={styles.vacationBanner}>
              <Text style={styles.vacationText}>
                On vacation until {formatDate(new Date(item.vacation_end))}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              (item.status === SubscriptionStatus.COMPLETED || 
              item.status === SubscriptionStatus.CANCELLED) && styles.disabledButton
            ]}
            onPress={() => handleSubscriptionStatusChange(item.subscription_id, item.status)}
            disabled={item.status === SubscriptionStatus.COMPLETED || item.status === SubscriptionStatus.CANCELLED}
          >
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('SubscriptionDetailsScreen', { subscriptionId: item.subscription_id })}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
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
    );
  };

  // Load active subscriptions
  const loadActiveSubscriptions = async () => {
    try {
      // Get all active subscriptions for this vendor
      const allSubscriptions = await localData.getSubscriptionsByVendor(user.id);
      
      // Get currently active subscriptions (not on vacation)
      const active = await localData.getActiveSubscriptions();
      const vendorActive = active.filter(sub => sub.vendor_id === user.id);
      
      // Get all subscriptions that are active but might be on vacation
      const activeButMaybeOnVacation = allSubscriptions.filter(sub => 
        sub.status === 'active' && sub.vendor_id === user.id
      );
      
      // Count subscriptions that are on vacation
      const onVacation = activeButMaybeOnVacation.filter(sub => {
        return sub.vacation_mode && 
               new Date() >= new Date(sub.vacation_start) && 
               new Date() <= new Date(sub.vacation_end);
      });
      
      // Set all active subscriptions, including those on vacation
      setActiveSubscriptions(activeButMaybeOnVacation);
      
      // Set counts
      setActiveDeliveryCount(vendorActive.length);
      setVacationSubscriptionsCount(onVacation.length);
    } catch (error) {
      console.error('Error loading active subscriptions:', error);
    }
  };

  // Add useEffect to load active subscriptions
  useEffect(() => {
    if (user) {
      loadActiveSubscriptions();
      
      // Load vendor status (this would come from a real backend)
      const loadVendorStatus = async () => {
        // For now, we'll mock this with local storage
        try {
          const status = await AsyncStorage.getItem(`vendor_${user.id}_status`);
          if (status) {
            setVendorStatus(status);
          }
        } catch (error) {
          console.error('Error loading vendor status:', error);
        }
      };
      
      loadVendorStatus();
    }
  }, [user]);

  // Toggle vendor availability status
  const toggleVendorStatus = async () => {
    try {
      const newStatus = vendorStatus === 'available' ? 'unavailable' : 'available';
      
      // In a real app, this would call an API
      // For now, just use AsyncStorage
      await AsyncStorage.setItem(`vendor_${user.id}_status`, newStatus);
      
      setVendorStatus(newStatus);
      
      // Show confirmation
      Alert.alert(
        'Status Updated',
        `You are now ${newStatus === 'available' ? 'available' : 'unavailable'} for deliveries.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating vendor status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Process all pending deliveries
  const processBulkDeliveries = async (action) => {
    if (activeSubscriptions.length === 0) {
      Alert.alert('No Active Subscriptions', 'There are no active subscriptions to process.');
      return;
    }
    
    setProcessingDeliveries(true);
    
    try {
      // Create a list of deliveries to process
      const today = new Date();
      const deliveryPromises = activeSubscriptions.map(async subscription => {
        // For each subscription, check if there's a delivery due today
        // In a real app, this would be more sophisticated
        
        const deliveryData = {
          subscription_id: subscription.subscription_id,
          user_id: subscription.user_id,
          vendor_id: user.id,
          scheduled_date: today.toISOString(),
          status: action === 'deliver' ? 'delivered' : 'canceled',
          created_at: new Date().toISOString()
        };
        
        await localData.addDelivery(deliveryData);
      });
      
      await Promise.all(deliveryPromises);
      
      // Show success message
      Alert.alert(
        'Success',
        action === 'deliver' ? 
          'All active subscriptions have been marked as delivered.' : 
          'All active subscriptions have been marked as out of delivery.',
        [{ text: 'OK' }]
      );
      
      // Refresh data
      loadActiveSubscriptions();
    } catch (error) {
      console.error('Error processing bulk deliveries:', error);
      Alert.alert('Error', 'Failed to process deliveries');
    } finally {
      setProcessingDeliveries(false);
      setShowSubscriptionModal(false);
    }
  };

  // Render subscription management modal
  const renderSubscriptionModal = () => {
    return (
      <Modal
        visible={showSubscriptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscription Management</Text>
              <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              You have {activeSubscriptions.length} active subscriptions.
              Choose an action to apply to all active subscriptions.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deliverButton]}
                onPress={() => processBulkDeliveries('deliver')}
                disabled={processingDeliveries}
              >
                {processingDeliveries ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Mark All as Delivered</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => processBulkDeliveries('cancel')}
                disabled={processingDeliveries}
              >
                {processingDeliveries ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Mark All as Out of Delivery</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      
      {/* Add at the top of your existing UI */}
      <View style={styles.vendorControlsContainer}>
        <TouchableOpacity
          style={[
            styles.statusToggle,
            vendorStatus === 'available' ? styles.availableStatus : styles.unavailableStatus
          ]}
          onPress={toggleVendorStatus}
        >
          <Text style={styles.statusToggleText}>
            {vendorStatus === 'available' ? 'Available for Delivery' : 'Unavailable for Delivery'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.subscriptionManageButton}
          onPress={() => setShowSubscriptionModal(true)}
        >
          <Text style={styles.subscriptionManageText}>Manage Subscriptions</Text>
        </TouchableOpacity>
      </View>
      
      {/* Add the subscription modal */}
      {renderSubscriptionModal()}
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
  vendorControlsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
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
  statusToggle: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  availableStatus: {
    backgroundColor: '#4CAF50',
  },
  unavailableStatus: {
    backgroundColor: '#F44336',
  },
  statusToggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  subscriptionManageButton: {
    backgroundColor: '#4e9af1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscriptionManageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  item: {
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  itemHeaderLeft: {
  },
  itemHeaderRight: {
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  itemDate: {
    fontSize: 14,
    color: '#666'
  },
  itemBody: {
    padding: 16
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  deliveryDetails: {
    fontSize: 14,
    color: '#666'
  },
  deliveryInfo: {
    flexDirection: 'row',
    marginBottom: 8
  },
  infoLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  vacationBanner: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#fff3e0',
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  vacationText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5'
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f7fa'
  },
  actionButtonText: {
    color: '#666',
    fontWeight: '500'
  },
  // Dashboard styles
  dashboardSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Subscription item styles
  subscriptionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subscriptionId: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#e6f7ed',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  activeText: {
    color: '#1e8a3e',
    fontSize: 12,
    fontWeight: '600',
  },
  vacationBadge: {
    backgroundColor: '#fef2d9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  vacationText: {
    color: '#f5a623',
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionBody: {
    padding: 12,
  },
  productInfo: {
    marginBottom: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deliveryInfo: {
    fontSize: 13,
    color: '#4e9af1',
    marginTop: 2,
  },
  vacationDeliveryInfo: {
    color: '#f5a623',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default OrderManagementScreen;
