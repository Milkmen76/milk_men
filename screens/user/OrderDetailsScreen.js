import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Platform,
  Alert,
  Share
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

// Get product image from base64 or default
const getProductImage = (product) => {
  if (product?.image_base64) {
    return { uri: `data:image/jpeg;base64,${product.image_base64}` };
  }
  return require('../../assets/milk-icon.png');
};

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [orderTimeline, setOrderTimeline] = useState([]);
  
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
      
      // Fetch order details
      const orderData = await localData.getOrderById(orderId);
      if (!orderData) {
        throw new Error('Order not found');
      }
      setOrder(orderData);
      
      // Fetch vendor details
      if (orderData.vendor_id) {
        const vendorData = await localData.getUserById(orderData.vendor_id);
        setVendor(vendorData);
      }
      
      // Fetch product details
      if (Array.isArray(orderData.products)) {
        const productPromises = orderData.products.map(productId => 
          localData.getProductById(productId)
        );
        const productsData = await Promise.all(productPromises);
        setProducts(productsData.filter(p => p !== null));
      }
      
      // Create order timeline
      generateOrderTimeline(orderData);
      
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };
  
  const generateOrderTimeline = (orderData) => {
    const timeline = [];
    
    // Order placed
    timeline.push({
      status: 'Order Placed',
      date: orderData.created_at || orderData.date,
      description: 'Your order has been received',
      completed: true,
      current: orderData.status === 'pending'
    });
    
    // Processing
    timeline.push({
      status: 'Processing',
      date: getStatusDate(orderData, 'processing'),
      description: 'Your order is being prepared',
      completed: ['processing', 'out for delivery', 'delivered'].includes(orderData.status),
      current: orderData.status === 'processing'
    });
    
    // Out for delivery
    timeline.push({
      status: 'Out for Delivery',
      date: getStatusDate(orderData, 'out for delivery'),
      description: 'Your order is on its way',
      completed: ['out for delivery', 'delivered'].includes(orderData.status),
      current: orderData.status === 'out for delivery'
    });
    
    // Delivered
    timeline.push({
      status: 'Delivered',
      date: getStatusDate(orderData, 'delivered'),
      description: 'Your order has been delivered',
      completed: orderData.status === 'delivered',
      current: orderData.status === 'delivered'
    });
    
    // If cancelled
    if (orderData.status === 'cancelled') {
      timeline.push({
        status: 'Cancelled',
        date: getStatusDate(orderData, 'cancelled'),
        description: 'Your order has been cancelled',
        completed: true,
        current: true,
        isCancelled: true
      });
    }
    
    setOrderTimeline(timeline);
  };
  
  const getStatusDate = (orderData, status) => {
    // In a real app, you would have a status history with timestamps
    // Here we're using the order date as a fallback
    return orderData.status_updates?.[status] || orderData.created_at || orderData.date;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };
  
  const shareOrder = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      
      // Get vendor details
      const vendorInfo = vendor || {};
      
      // Get product details with quantities
      let productDetails = [];
      let totalAmount = 0;
      
      if (Array.isArray(order.products)) {
        const productPromises = order.products.map(async (productId, index) => {
          const product = await localData.getProductById(productId);
          if (product) {
            const quantity = order.quantities ? order.quantities[index] : 1;
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
      
      // Format date for invoice
      const formatInvoiceDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };
      
      // Check if order is from a subscription
      let subscriptionDetails = null;
      if (order.subscription_id) {
        subscriptionDetails = await localData.getSubscriptionById(order.subscription_id);
      }
      
      // Generate invoice text
      const invoiceText = 
        `INVOICE\n` +
        `===================================\n\n` +
        `Order #${order.order_id}\n` +
        `Date: ${formatInvoiceDate(order.created_at || order.date)}\n` +
        `Status: ${order.status.toUpperCase()}\n\n` +
        
        `VENDOR DETAILS\n` +
        `===================================\n` +
        `Name: ${vendorInfo?.profile_info?.business_name || vendorInfo?.name || 'N/A'}\n` +
        `Address: ${vendorInfo?.profile_info?.address || 'N/A'}\n` +
        `Contact: ${vendorInfo?.profile_info?.phone || vendorInfo?.phone_number || 'N/A'}\n\n` +
        
        `${subscriptionDetails ? 'SUBSCRIPTION DETAILS\n' + 
        '===================================\n' +
        `Subscription ID: ${subscriptionDetails.subscription_id}\n` +
        `Type: ${subscriptionDetails.type}\n` +
        `Period: ${formatInvoiceDate(subscriptionDetails.start_date)} to ${formatInvoiceDate(subscriptionDetails.end_date)}\n\n` : ''}` +
        
        `DELIVERY DETAILS\n` +
        `===================================\n` +
        `Address: ${order.delivery_address || user?.profile_info?.address || 'Not specified'}\n` +
        `Date: ${formatInvoiceDate(order.delivery_date)}\n` +
        `Time: ${order.delivery_time || 'Not specified'}\n\n` +
        
        `PRODUCT DETAILS\n` +
        `===================================\n` +
        productDetails.map(p => `${p.name} (${p.quantity} x ₹${p.price.toFixed(2)}) = ₹${p.amount.toFixed(2)}`).join('\n') +
        `\n\n` +
        
        `PAYMENT DETAILS\n` +
        `===================================\n` +
        `Subtotal: ₹${totalAmount.toFixed(2)}\n` +
        `Delivery Fee: ₹0.00\n` +
        `Discount: ₹0.00\n` +
        `Total Amount: ₹${totalAmount.toFixed(2)}\n\n` +
        
        `Thank you for your order!\n` +
        `===================================\n` +
        `${vendorInfo?.profile_info?.business_name || vendorInfo?.name || 'Milk Delivery'}\n`;
      
      // Share the invoice
      await Share.share({
        message: invoiceText,
        title: `Order Details #${order.order_id}`
      });
      
    } catch (error) {
      console.error('Error sharing order:', error);
      Alert.alert('Error', 'Failed to share order details');
    } finally {
      setLoading(false);
    }
  };
  
  const cancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: async () => {
            try {
              await localData.updateOrderStatus(order.order_id, 'cancelled');
              Alert.alert('Success', 'Your order has been cancelled');
              loadOrderDetails(); // Reload order details
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          } 
        }
      ]
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.orderIdText}>Order #{order.order_id}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: order.status === 'cancelled' ? '#d9534f' : 
                             order.status === 'delivered' ? '#5cb85c' : 
                             order.status === 'out for delivery' ? '#4e9af1' : 
                             order.status === 'processing' ? '#5bc0de' : '#f0ad4e' }
          ]}>
            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Timeline</Text>
          
          <View style={styles.timeline}>
            {orderTimeline.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[
                    styles.timelineDot, 
                    item.completed ? styles.completedDot : styles.pendingDot,
                    item.current ? styles.currentDot : {},
                    item.isCancelled ? styles.cancelledDot : {}
                  ]} />
                  {index < orderTimeline.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      item.completed && orderTimeline[index + 1].completed ? styles.completedLine : styles.pendingLine
                    ]} />
                  )}
                </View>
                
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineStatus,
                    item.current ? styles.currentStatus : {},
                    item.isCancelled ? styles.cancelledStatus : {}
                  ]}>
                    {item.status}
                  </Text>
                  
                  <Text style={styles.timelineDate}>
                    {item.date ? formatDate(item.date) : 'Pending'}
                  </Text>
                  
                  <Text style={styles.timelineDescription}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {vendor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendor Information</Text>
            
            <View style={styles.vendorCard}>
              <Image
                source={vendor.profile_info?.logo_base64 
                  ? { uri: `data:image/jpeg;base64,${vendor.profile_info.logo_base64}` }
                  : require('../../assets/milk-icon.png')
                }
                style={styles.vendorImage}
              />
              
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>
                  {vendor.profile_info?.business_name || vendor.name || 'Vendor'}
                </Text>
                <Text style={styles.vendorAddress}>
                  {vendor.profile_info?.address || 'Address not available'}
                </Text>
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={() => Alert.alert('Contact', `Call ${vendor.profile_info?.phone || 'Not available'}`)}
                >
                  <Text style={styles.contactButtonText}>Contact Vendor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Address:</Text>
              <Text style={styles.deliveryValue}>{order.delivery_address || 'Not specified'}</Text>
            </View>
            
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Date:</Text>
              <Text style={styles.deliveryValue}>{formatDate(order.delivery_date)}</Text>
            </View>
            
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>Time:</Text>
              <Text style={styles.deliveryValue}>{order.delivery_time || 'Not specified'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          
          {products.length > 0 ? (
            products.map((product, index) => {
              const quantity = order.quantities?.[index] || 1;
              const itemTotal = product.price * quantity;
              
              return (
                <View key={product.product_id} style={styles.productItem}>
                  <Image 
                    source={getProductImage(product)} 
                    style={styles.productImage}
                  />
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>
                      {formatCurrency(product.price)} × {quantity}
                    </Text>
                  </View>
                  
                  <Text style={styles.itemTotal}>{formatCurrency(itemTotal)}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.noItemsText}>No items found</Text>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Method:</Text>
              <Text style={styles.paymentValue}>{order.payment_method || 'Cash on Delivery'}</Text>
            </View>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Item Total:</Text>
              <Text style={styles.paymentValue}>{formatCurrency(order.total)}</Text>
            </View>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Delivery Fee:</Text>
              <Text style={styles.paymentValue}>₹0.00</Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={shareOrder}
          >
            <Text style={styles.shareButtonText}>Share Order</Text>
          </TouchableOpacity>
          
          {order.status === 'pending' && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={cancelOrder}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#d9534f',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
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
  orderIdText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timeline: {
    marginLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeftColumn: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  completedDot: {
    borderColor: '#5cb85c',
    backgroundColor: '#5cb85c',
  },
  pendingDot: {
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  currentDot: {
    borderColor: '#4e9af1',
    backgroundColor: '#4e9af1',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  cancelledDot: {
    borderColor: '#d9534f',
    backgroundColor: '#d9534f',
  },
  timelineLine: {
    position: 'absolute',
    width: 2,
    top: 14,
    bottom: -16,
    backgroundColor: '#ccc',
    left: 11,
    zIndex: 1,
  },
  completedLine: {
    backgroundColor: '#5cb85c',
  },
  pendingLine: {
    backgroundColor: '#ccc',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  currentStatus: {
    color: '#4e9af1',
  },
  cancelledStatus: {
    color: '#d9534f',
  },
  timelineDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timelineDescription: {
    fontSize: 12,
    color: '#666',
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  vendorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e3f2fd',
  },
  vendorInfo: {
    flex: 1,
    marginLeft: 16,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vendorAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  contactButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  deliveryCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  deliveryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  deliveryLabel: {
    width: 80,
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  deliveryValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  noItemsText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 15,
    color: '#666',
  },
  paymentValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4e9af1',
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#4e9af1',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d9534f',
  },
  cancelButtonText: {
    color: '#d9534f',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderDetailsScreen; 