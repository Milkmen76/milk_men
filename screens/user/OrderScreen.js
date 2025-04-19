import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

const OrderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { vendorId, vendorName, products, totalPrice } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('Your current address'); // In a real app, get from user profile

  // Mock payment method - in a real app, you would have more payment options
  const [paymentMethod, setPaymentMethod] = useState('cash');

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
        amount: totalPrice
      };
      
      const newTransaction = await localData.addTransaction(transactionData);
      
      if (!newTransaction) {
        throw new Error('Failed to record transaction');
      }
      
      // Show success message
      Alert.alert(
        'Order Placed Successfully',
        'Your order has been placed and will be delivered soon.',
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
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{item.price.toFixed(2)} x {item.quantity}</Text>
      </View>
      <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>{vendorName}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Items</Text>
        <FlatList
          data={products}
          renderItem={renderOrderItem}
          keyExtractor={item => item.product_id}
          scrollEnabled={false}
        />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={styles.addressBox}>
          <Text style={styles.addressText}>{deliveryAddress}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentOptions}>
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              paymentMethod === 'cash' && styles.selectedPaymentOption
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text style={styles.paymentOptionText}>Cash on Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Total</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          {products.length > 0 ? (
            <Text style={styles.totalValue}>₹{totalPrice.toFixed(2)}</Text>
          ) : (
            <Text style={styles.totalValue}>₹0.00</Text>
          )}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Delivery Fee</Text>
          <Text style={styles.totalValue}>$0.00</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Grand Total:</Text>
          <Text style={styles.grandTotalValue}>₹{totalPrice.toFixed(2)}</Text>
        </View>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  vendorInfo: {
    marginBottom: 8
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4
  },
  productPrice: {
    fontSize: 14,
    color: '#666'
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  addressBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f8f8'
  },
  addressText: {
    color: '#444',
    fontSize: 15
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    marginBottom: 10
  },
  selectedPaymentOption: {
    borderColor: '#4e9af1',
    backgroundColor: '#e6f2ff'
  },
  paymentOptionText: {
    color: '#444',
    fontSize: 15
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  totalLabel: {
    fontSize: 15,
    color: '#666'
  },
  totalValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4e9af1'
  },
  placeOrderButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});

export default OrderScreen;
