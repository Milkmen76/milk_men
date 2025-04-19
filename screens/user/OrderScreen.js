import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Modal,
  Platform,
  SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

// Get product image from base64 or default
const getProductImage = (product) => {
  if (product.image_base64) {
    return { uri: `data:image/jpeg;base64,${product.image_base64}` };
  }
  return require('../../assets/milk-icon.png');
};

const OrderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { vendorId, vendorName, products, totalPrice } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.profile_info?.address || 'Add delivery address');
  const [deliveryDate, setDeliveryDate] = useState(getTomorrowDate()); // Default to tomorrow
  const [deliveryTime, setDeliveryTime] = useState('morning'); // morning, afternoon, evening
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Mock payment method - in a real app, you would have more payment options
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Get tomorrow's date
  function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Format date for display
  function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to place an order');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create order in local storage
      const orderData = {
        user_id: user.id,
        vendor_id: vendorId,
        products: products.map(p => p.product_id),
        status: 'pending',
        total: totalPrice,
        delivery_date: deliveryDate.toISOString(),
        delivery_time: deliveryTime,
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
        created_at: new Date().toISOString()
      };
      
      const newOrder = await localData.addOrder(orderData);
      
      if (!newOrder) {
        throw new Error('Failed to create order');
      }
      
      // Create transaction record
      const transactionData = {
        user_id: user.id,
        vendor_id: vendorId,
        amount: totalPrice,
        payment_method: paymentMethod,
        order_id: newOrder.order_id
      };
      
      const newTransaction = await localData.addTransaction(transactionData);
      
      if (!newTransaction) {
        throw new Error('Failed to record transaction');
      }
      
      // Show success message
      Alert.alert(
        'Order Placed Successfully',
        `Your order has been placed and will be delivered on ${formatDate(deliveryDate)}.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate back to home screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserHome' }]
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <Image 
        source={getProductImage(item)} 
        style={styles.productImage}
        resizeMode="contain"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{item.price.toFixed(2)} x {item.quantity}</Text>
      </View>
      <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );

  const handleDateChange = (offset) => {
    const newDate = new Date(deliveryDate);
    newDate.setDate(newDate.getDate() + offset);
    
    // Don't allow dates in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate >= today) {
      setDeliveryDate(newDate);
    }
  };

  const timeSlots = [
    { id: 'morning', label: 'Morning', time: '6:00 AM - 9:00 AM', icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon', time: '12:00 PM - 3:00 PM', icon: '☀️' },
    { id: 'evening', label: 'Evening', time: '5:00 PM - 8:00 PM', icon: '🌇' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Your Order</Text>
        </View>
        
        <View style={styles.vendorCard}>
          <View style={styles.vendorIconContainer}>
            <Text style={styles.vendorIcon}>🥛</Text>
          </View>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{vendorName}</Text>
            <View style={styles.vendorBadge}>
              <Text style={styles.vendorBadgeText}>Trusted Vendor</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <FlatList
            data={products}
            renderItem={renderOrderItem}
            keyExtractor={item => item.product_id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryIconContainer}>
              <Text style={styles.deliveryIcon}>📍</Text>
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Delivery Address</Text>
              <Text style={styles.deliveryValue}>{deliveryAddress}</Text>
            </View>
          </View>
          
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryIconContainer}>
              <Text style={styles.deliveryIcon}>📅</Text>
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Delivery Date</Text>
              <View style={styles.dateSelector}>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => handleDateChange(-1)}
                >
                  <Text style={styles.dateButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.selectedDate}>
                  <Text style={styles.selectedDateText}>{formatDate(deliveryDate)}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => handleDateChange(1)}
                >
                  <Text style={styles.dateButtonText}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <Text style={styles.deliveryTimeTitle}>Delivery Time Slot</Text>
          
          <View style={styles.timeSlotContainer}>
            {timeSlots.map(slot => (
              <TouchableOpacity 
                key={slot.id}
                style={[
                  styles.timeSlot,
                  deliveryTime === slot.id && styles.selectedTimeSlot
                ]}
                onPress={() => setDeliveryTime(slot.id)}
              >
                <Text style={styles.timeSlotIcon}>{slot.icon}</Text>
                <Text 
                  style={[
                    styles.timeSlotLabel,
                    deliveryTime === slot.id && styles.selectedTimeSlotLabel
                  ]}
                >
                  {slot.label}
                </Text>
                <Text 
                  style={[
                    styles.timeSlotTime,
                    deliveryTime === slot.id && styles.selectedTimeSlotTime
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity 
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.selectedPaymentOption]}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={styles.paymentIconContainer}>
              <Text style={styles.paymentIcon}>💵</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Cash on Delivery</Text>
              <Text style={styles.paymentDesc}>Pay when you receive your order</Text>
            </View>
            <View style={[
              styles.paymentCheckbox,
              paymentMethod === 'cash' && styles.paymentCheckboxSelected
            ]}>
              {paymentMethod === 'cash' && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Details</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item Total</Text>
            <Text style={styles.priceValue}>₹{totalPrice.toFixed(2)}</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text style={styles.priceValue}>₹0.00</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalPrice.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.bottomTotalLabel}>Total</Text>
          <Text style={styles.bottomTotalValue}>₹{totalPrice.toFixed(2)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderButtonText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
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
  vendorIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vendorIcon: {
    fontSize: 24,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vendorBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  vendorBadgeText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
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
  itemSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
  },
  deliveryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deliveryIcon: {
    fontSize: 20,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4e9af1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedDate: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deliveryTimeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  timeSlotContainer: {
    flexDirection: 'column',
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedTimeSlot: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4e9af1',
    borderWidth: 1,
  },
  timeSlotIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  timeSlotLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    width: 100,
  },
  selectedTimeSlotLabel: {
    color: '#4e9af1',
  },
  timeSlotTime: {
    fontSize: 14,
    color: '#666',
  },
  selectedTimeSlotTime: {
    color: '#4e9af1',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPaymentOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4e9af1',
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentIcon: {
    fontSize: 20,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  paymentDesc: {
    fontSize: 14,
    color: '#666',
  },
  paymentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCheckboxSelected: {
    borderColor: '#4e9af1',
    backgroundColor: '#4e9af1',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  priceContainer: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 14,
    color: '#666',
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeOrderButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderScreen;
