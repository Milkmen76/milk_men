import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  Share,
  RefreshControl
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import moment from 'moment';

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

// Function to get the image source for a product
const getProductImage = (product) => {
  // If product has base64 image data, use it
  if (product?.image_base64) {
    return { uri: `data:image/jpeg;base64,${product.image_base64}` };
  }
  
  // Default fallback image
  return require('../../assets/milk-icon.png');
};

const OrderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { orderId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Load order details on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOrderDetails();
    }, [orderId])
  );
  
  const loadOrderDetails = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID is missing');
      navigation.goBack();
      return;
    }
    
    try {
      setLoading(true);
      
      // Get all orders
      const allOrders = await localData.getOrders();
      
      // Find the specific order using order_id
      const orderData = allOrders.find(o => o.order_id === orderId);
      
      if (!orderData) {
        throw new Error('Order not found');
      }
      
      // Check if this order belongs to the current vendor (if user is a vendor)
      if (user.role === 'vendor' && orderData.vendor_id !== user.id) {
        Alert.alert('Error', 'You do not have permission to view this order');
        navigation.goBack();
        return;
      }
      
      setOrder(orderData);
      
      // Get customer data
      const customerData = await localData.getUserById(orderData.user_id);
      setCustomer(customerData);
      
      // Get product details for each product in the order
      const productDetails = [];
      if (Array.isArray(orderData.products) && orderData.products.length > 0) {
        for (let i = 0; i < orderData.products.length; i++) {
          const productId = orderData.products[i];
          const quantity = orderData.quantities?.[i] || 1;
          
          try {
            const productData = await localData.getProductById(productId);
            
            if (productData) {
              const price = parseFloat(productData.price || 0);
              productDetails.push({
                ...productData,
                quantity,
                totalPrice: price * quantity
              });
            }
          } catch (error) {
            console.error(`Error loading product ${productId}:`, error);
          }
        }
      }
      
      setProducts(productDetails);
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Error', 'Failed to load order details: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadOrderDetails();
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
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
  
  const updateOrderStatus = async (newStatus) => {
    if (!order) return;
    
    try {
      setUpdatingStatus(true);
      
      // Use order_id for updating
      const success = await localData.updateOrderStatus(order.order_id, newStatus);
      
      if (success) {
        // Reload full order data to ensure we have latest state
        await loadOrderDetails();
        Alert.alert('Success', `Order status updated to ${newStatus}`);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status: ' + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  const handleStatusChange = (newStatus) => {
    Alert.alert(
      'Update Order Status',
      `Are you sure you want to change the status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => updateOrderStatus(newStatus) }
      ]
    );
  };
  
  const shareOrderDetails = async () => {
    if (!order) return;
    
    try {
      let message = `Order #${order.order_id}\n`;
      message += `Date: ${formatDate(order.created_at || order.date)}\n`;
      message += `Status: ${order.status?.toUpperCase() || 'PENDING'}\n`;
      message += `Customer: ${customer?.name || 'Customer'}\n\n`;
      
      message += 'Products:\n';
      let total = 0;
      
      products.forEach((product, index) => {
        const itemTotal = product.price * product.quantity;
        total += itemTotal;
        message += `- ${product.name} x${product.quantity}: ₹${itemTotal.toFixed(2)}\n`;
      });
      
      message += `\nTotal Amount: ₹${parseFloat(order.total || total).toFixed(2)}`;
      
      await Share.share({
        message,
        title: `Order Details #${order.order_id}`
      });
    } catch (error) {
      console.error('Error sharing order details:', error);
      Alert.alert('Error', 'Failed to share order details');
    }
  };
  
  const renderStatusOptions = () => {
    const statuses = ['pending', 'processing', 'out for delivery', 'delivered', 'cancelled'];
    const currentStatus = order?.status?.toLowerCase() || 'pending';
    
    return (
      <View style={styles.statusOptionsContainer}>
        <Text style={styles.statusOptionsTitle}>Update Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusOptions}>
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                { backgroundColor: getStatusColor(status) },
                currentStatus === status && styles.currentStatusOption
              ]}
              onPress={() => handleStatusChange(status)}
              disabled={updatingStatus || currentStatus === status}
            >
              <Text style={styles.statusOptionText}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4e9af1']}
            tintColor="#4e9af1"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Order ID:</Text>
            <Text style={styles.orderId}>{order.order_id}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(order.status) }
            ]}>
              <Text style={styles.statusText}>
                {order.status ? order.status.toUpperCase() : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(order.created_at || order.date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Amount:</Text>
            <Text style={styles.infoValue}>₹{parseFloat(order.total || 0).toFixed(2)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>
              {order.payment_method ? order.payment_method.toUpperCase() : 'CASH ON DELIVERY'}
            </Text>
          </View>
          
          {order.delivery_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Delivery Time:</Text>
              <Text style={styles.infoValue}>{order.delivery_time}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          
          {customer ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{customer.name}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{customer.email || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>
                  {customer.phone || customer.profile_info?.phone || 'N/A'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>Customer information not available</Text>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addressText}>
            {order.delivery_address || customer?.profile_info?.address || 'No delivery address specified'}
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          
          {products.length > 0 ? (
            products.map((product, index) => (
              <View key={product.product_id || index} style={styles.productCard}>
                <Image 
                  source={getProductImage(product)}
                  style={styles.productImage}
                  resizeMode="contain"
                />
                
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  
                  <View style={styles.productDetails}>
                    <Text style={styles.productPrice}>
                      ₹{parseFloat(product.price || 0).toFixed(2)} x {product.quantity}
                    </Text>
                    <Text style={styles.productTotal}>
                      ₹{parseFloat(product.totalPrice || 0).toFixed(2)}
                    </Text>
                  </View>
                  
                  {product.category && (
                    <Text style={styles.productCategory}>{product.category}</Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No product information available</Text>
          )}
          
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>
                ₹{products.reduce((sum, product) => sum + (product.totalPrice || 0), 0).toFixed(2)}
              </Text>
            </View>
            
            {order.delivery_fee && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Delivery Fee:</Text>
                <Text style={styles.totalValue}>₹{parseFloat(order.delivery_fee).toFixed(2)}</Text>
              </View>
            )}
            
            {order.discount && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount:</Text>
                <Text style={[styles.totalValue, { color: '#4CAF50' }]}>
                  -₹{parseFloat(order.discount).toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>
                ₹{parseFloat(order.total || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
        
        {user.role === 'vendor' && renderStatusOptions()}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={shareOrderDetails}
          >
            <MaterialIcons name="share" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.shareButtonText}>Share Order Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={18} color="#666" style={styles.buttonIcon} />
            <Text style={styles.backButtonText}>Back to Orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContainer: {
    padding: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_XL,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_L,
    backgroundColor: '#f5f7fa',
  },
  errorText: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: SIZES.PADDING_M,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_M,
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    ...getShadowStyles(2),
  },
  orderIdContainer: {
    flex: 1,
  },
  orderIdLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_XS,
  },
  orderId: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    marginLeft: SIZES.PADDING_S,
  },
  statusBadge: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
  },
  statusText: {
    color: '#fff',
    fontSize: SIZES.SMALL,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_L,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    ...getShadowStyles(2),
  },
  sectionTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_M,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: SIZES.PADDING_XS,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: SIZES.PADDING_S,
  },
  infoLabel: {
    width: scale(120),
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: SIZES.BODY,
    color: '#333',
  },
  addressText: {
    fontSize: SIZES.BODY,
    color: '#333',
    lineHeight: SIZES.BODY * 1.5,
  },
  noDataText: {
    fontSize: SIZES.BODY,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SIZES.PADDING_S,
  },
  productCard: {
    flexDirection: 'row',
    padding: SIZES.PADDING_S,
    marginBottom: SIZES.PADDING_S,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#f0f8ff',
    marginRight: SIZES.PADDING_S,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: SIZES.BODY,
    fontWeight: '600',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.PADDING_XS,
  },
  productPrice: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  productTotal: {
    fontSize: SIZES.BODY,
    fontWeight: '600',
    color: '#4e9af1',
  },
  productCategory: {
    fontSize: SIZES.CAPTION,
    color: '#888',
  },
  totalSection: {
    marginTop: SIZES.PADDING_M,
    paddingTop: SIZES.PADDING_M,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.PADDING_XS,
  },
  totalLabel: {
    fontSize: SIZES.BODY,
    color: '#666',
  },
  totalValue: {
    fontSize: SIZES.BODY,
    color: '#333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.PADDING_S,
    paddingTop: SIZES.PADDING_S,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  grandTotalLabel: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#4e9af1',
  },
  statusOptionsContainer: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_L,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    ...getShadowStyles(2),
  },
  statusOptionsTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -SIZES.PADDING_XS,
  },
  statusOption: {
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    margin: SIZES.PADDING_XS,
    opacity: 0.8,
  },
  currentStatusOption: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
    ...getShadowStyles(1),
  },
  statusOptionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.CAPTION,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.PADDING_L,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4e9af1',
    borderRadius: SIZES.RADIUS_S,
    paddingVertical: SIZES.PADDING_S,
    marginRight: SIZES.PADDING_XS,
    alignItems: 'center',
    justifyContent: 'center',
    ...getShadowStyles(1),
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600', 
    fontSize: SIZES.BODY,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_S,
    paddingVertical: SIZES.PADDING_S,
    marginLeft: SIZES.PADDING_XS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: SIZES.BODY,
  },
  buttonIcon: {
    marginRight: SIZES.PADDING_XS,
  }
});

export default OrderDetailScreen; 