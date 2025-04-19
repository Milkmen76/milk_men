import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import moment from 'moment';

// Function to get the image source for a product
const getProductImage = (product) => {
  // If product has base64 image data, use it
  if (product.image_base64) {
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
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);
  
  const loadOrderDetails = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID is missing');
      navigation.goBack();
      return;
    }
    
    try {
      setLoading(true);
      
      // Get order data
      const orderData = await localData.getOrderById(orderId);
      if (!orderData) {
        throw new Error('Order not found');
      }
      
      // Check if this order belongs to the current vendor
      if (orderData.vendorId !== user.id) {
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
      if (Array.isArray(orderData.products)) {
        for (const item of orderData.products) {
          const productId = typeof item === 'object' ? item.product_id : item;
          const quantity = typeof item === 'object' ? item.quantity : 1;
          const price = typeof item === 'object' ? item.price : 0;
          
          const productData = await localData.getProductById(productId);
          
          if (productData) {
            productDetails.push({
              ...productData,
              quantity,
              totalPrice: price * quantity
            });
          }
        }
      }
      
      setProducts(productDetails);
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Error', 'Failed to load order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
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
      
      const updatedOrder = {
        ...order,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      const success = await localData.updateOrder(order.id, updatedOrder);
      
      if (success) {
        setOrder(updatedOrder);
        Alert.alert('Success', `Order status updated to ${newStatus}`);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }
  
  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Order ID:</Text>
            <Text style={styles.orderId}>{order.id}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
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
            <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Amount:</Text>
            <Text style={styles.infoValue}>₹{parseFloat(order.total).toFixed(2)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>
              {order.payment_method ? order.payment_method.toUpperCase() : 'N/A'}
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
            {order.delivery_address || 'No delivery address specified'}
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
                      ₹{parseFloat(product.price).toFixed(2)} x {product.quantity}
                    </Text>
                    <Text style={styles.productTotal}>
                      ₹{parseFloat(product.totalPrice).toFixed(2)}
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
        </View>
        
        {renderStatusOptions()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f7fa',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4e9af1',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  orderId: {
    fontSize: 16,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    width: 120,
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  addressText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  noDataText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  productCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  productTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4e9af1',
  },
  productCategory: {
    fontSize: 13,
    color: '#888',
  },
  statusOptionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusOptionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusOptions: {
    flexDirection: 'row',
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    opacity: 0.8,
  },
  currentStatusOption: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  statusOptionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default OrderDetailScreen; 