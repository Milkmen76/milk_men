import React, { useState, useEffect } from 'react';
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
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

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
  
  // Vacation mode related state
  const [hasActiveSubscriptions, setHasActiveSubscriptions] = useState(false);
  const [isOnVacation, setIsOnVacation] = useState(false);
  
  // Check if user has active subscriptions and vacation status
  useEffect(() => {
    const checkSubscriptionsAndVacation = async () => {
      if (!user) return;
      
      try {
        // Get user's subscriptions
        const userSubscriptions = await localData.getSubscriptionsByUser(user.id);
        
        // Check if user has any subscriptions
        setHasActiveSubscriptions(userSubscriptions.length > 0);
        
        // Check if all subscriptions are on vacation
        const allOnVacation = userSubscriptions.length > 0 && 
          userSubscriptions.every(sub => sub.vacation_mode);
        
        setIsOnVacation(allOnVacation);
      } catch (error) {
        console.error('Error checking subscriptions:', error);
      }
    };
    
    checkSubscriptionsAndVacation();
  }, [user]);
  
  // Handle vacation mode button press
  const handleVacationPress = () => {
    // Navigate to MyOrdersScreen with subscriptions tab active
    navigation.navigate('MyOrdersScreen', { initialTab: 'subscriptions' });
  };

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
        
        {/* Vacation mode banner */}
        {hasActiveSubscriptions && (
          <TouchableOpacity 
            style={[styles.vacationBanner, isOnVacation && styles.activeVacationBanner]}
            onPress={handleVacationPress}
          >
            <View style={styles.vacationIconContainer}>
              <Text style={styles.vacationIcon}>{isOnVacation ? '✈️' : '🏖️'}</Text>
            </View>
            <View style={styles.vacationInfo}>
              <Text style={styles.vacationTitle}>
                {isOnVacation ? 'Vacation Mode is Active' : 'Going on vacation?'}
              </Text>
              <Text style={styles.vacationDescription}>
                {isOnVacation 
                  ? 'Your subscriptions are currently paused' 
                  : 'Pause your milk deliveries while you\'re away'}
              </Text>
            </View>
            <View style={styles.vacationArrow}>
              <Text style={styles.vacationArrowText}>›</Text>
            </View>
          </TouchableOpacity>
        )}
        
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
        
        {/* Add some bottom padding to ensure the content isn't hidden behind the bottom bar */}
        <View style={{ height: SIZES.PADDING_XL * 3 }} />
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
    backgroundColor: '#f5f7fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: SIZES.PADDING_M,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_M,
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    ...getShadowStyles(2),
  },
  vendorIconContainer: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_M,
  },
  vendorIcon: {
    fontSize: SIZES.TITLE,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  vendorBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: SIZES.PADDING_S,
    paddingVertical: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_ROUND,
    alignSelf: 'flex-start',
  },
  vendorBadgeText: {
    fontSize: SIZES.CAPTION,
    color: '#2e7d32',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_M,
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    ...getShadowStyles(2),
  },
  sectionTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_M,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.PADDING_S,
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  productPrice: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  itemTotal: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: SIZES.PADDING_XS,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_M,
    backgroundColor: '#f8f8f8',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
  },
  deliveryIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_M,
  },
  deliveryIcon: {
    fontSize: SIZES.SUBTITLE,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_XS,
  },
  deliveryValue: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.PADDING_S,
  },
  dateButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#4e9af1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedDate: {
    flex: 1,
    paddingHorizontal: SIZES.PADDING_S,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
  },
  deliveryTimeTitle: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
    marginBottom: SIZES.PADDING_S,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.PADDING_S,
  },
  timeSlot: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_M,
    marginHorizontal: SIZES.PADDING_XS,
  },
  selectedTimeSlot: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4e9af1',
    borderWidth: 1,
  },
  timeSlotIcon: {
    fontSize: SIZES.SUBTITLE,
    marginBottom: SIZES.PADDING_XS,
  },
  timeSlotLabel: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_XS,
  },
  selectedTimeSlotLabel: {
    color: '#4e9af1',
  },
  timeSlotTime: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  selectedTimeSlotTime: {
    color: '#4e9af1',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPaymentOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4e9af1',
  },
  paymentIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_M,
  },
  paymentIcon: {
    fontSize: SIZES.SUBTITLE,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  paymentDesc: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  paymentCheckbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
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
    marginBottom: SIZES.PADDING_S,
  },
  priceLabel: {
    fontSize: SIZES.BODY,
    color: '#666',
  },
  priceValue: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: SIZES.PADDING_S,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.PADDING_XS,
  },
  totalLabel: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#4e9af1',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_S,
    paddingBottom: Platform.OS === 'ios' ? SIZES.PADDING_L : SIZES.PADDING_M,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    ...getShadowStyles(5),
  },
  priceContainer: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  bottomTotalValue: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
  },
  placeOrderButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_L,
    borderRadius: SIZES.RADIUS_M,
    minHeight: SIZES.BUTTON_HEIGHT,
    minWidth: scale(150),
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
  },
  // Vacation banner styles
  vacationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_XS,
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    borderWidth: 1,
    borderColor: '#4e9af1',
    borderStyle: 'dashed',
    ...getShadowStyles(1),
  },
  activeVacationBanner: {
    backgroundColor: '#e3f2fd',
    borderColor: '#FF9800',
  },
  vacationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_M,
  },
  vacationIcon: {
    fontSize: 20,
  },
  vacationInfo: {
    flex: 1,
  },
  vacationTitle: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  vacationDescription: {
    fontSize: SIZES.SMALL,
    color: '#666',
  },
  vacationArrow: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacationArrowText: {
    fontSize: 24,
    color: '#4e9af1',
    fontWeight: 'bold',
  },
});

export default OrderScreen;
