import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

// Get product image from base64 or default
const getProductImage = (product) => {
  // Log image details for debugging
  console.log(`Getting image for product: ${product.name}, Image: ${product.image}`);
  
  if (product.image_base64) {
    console.log(`Using base64 image for ${product.name}, data length: ${product.image_base64.length}`);
    return { uri: `data:image/jpeg;base64,${product.image_base64}` };
  }
  
  console.log(`Using fallback image for ${product.name}`);
  return require('../../assets/milk-icon.png');
};

const ProductListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { vendorId } = route.params || {};
  
  const [products, setProducts] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch vendor info
        const vendorData = await localData.getUserById(vendorId);
        setVendor(vendorData);
        
        // Fetch vendor's products
        const vendorProducts = await localData.getProductsByVendor(vendorId);
        setProducts(vendorProducts);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (vendorId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (getTotalItems() > 0) {
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      Animated.spring(animatedValue, {
        toValue: 0,
        friction: 7,
        useNativeDriver: true
      }).start();
    }
  }, [selectedProducts]);

  const handleAddToCart = (product) => {
    setSelectedProducts(prev => {
      const currentQty = prev[product.product_id] || 0;
      return {
        ...prev,
        [product.product_id]: currentQty + 1
      };
    });
  };

  const handleRemoveFromCart = (product) => {
    setSelectedProducts(prev => {
      const currentQty = prev[product.product_id] || 0;
      if (currentQty <= 0) return prev;
      
      const newQty = currentQty - 1;
      const updatedCart = {
        ...prev,
        [product.product_id]: newQty
      };
      
      // Remove product from cart if quantity is 0
      if (newQty === 0) {
        delete updatedCart[product.product_id];
      }
      
      return updatedCart;
    });
  };

  const getTotalItems = () => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return products.reduce((total, product) => {
      const qty = selectedProducts[product.product_id] || 0;
      return total + (product.price * qty);
    }, 0);
  };

  const handlePlaceOrder = () => {
    if (getTotalItems() === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return;
    }
    
    // Prepare the product list for OrderScreen
    const orderProducts = products.filter(product => 
      selectedProducts[product.product_id] > 0
    ).map(product => ({
      ...product,
      quantity: selectedProducts[product.product_id]
    }));
    
    navigation.navigate('OrderScreen', {
      vendorId,
      vendorName: vendor?.profile_info?.business_name || 'Vendor',
      products: orderProducts,
      totalPrice: getTotalPrice()
    });
  };

  const renderProductItem = ({ item }) => {
    const quantity = selectedProducts[item.product_id] || 0;
    const isInCart = quantity > 0;
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productContent}>
          <View style={styles.productImageContainer}>
            <Image 
              source={getProductImage(item)}
              style={styles.productImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
              {item.discount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.discount}% OFF</Text>
                </View>
              )}
            </View>
            
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={[styles.quantityButton, styles.removeButton, !isInCart && styles.disabledButton]}
                onPress={() => handleRemoveFromCart(item)}
                disabled={!isInCart}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              
              <View style={styles.quantityContainer}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.quantityButton, styles.addButton]}
                onPress={() => handleAddToCart(item)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {isInCart && (
          <View style={styles.itemTotal}>
            <Text style={styles.itemTotalText}>
              {quantity} x ₹{item.price.toFixed(2)} = ₹{(quantity * item.price).toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderVendorHeader = () => {
    if (!vendor) return null;
    
    return (
      <View style={styles.vendorHeader}>
        <View style={styles.vendorImageContainer}>
          {vendor.profile_info?.logo_base64 ? (
            <Image 
              source={{ uri: `data:image/jpeg;base64,${vendor.profile_info.logo_base64}` }}
              style={styles.vendorImage}
              resizeMode="cover"
            />
          ) : (
            <Image 
              source={require('../../assets/milk-icon.png')}
              style={styles.vendorImage}
              resizeMode="contain"
            />
          )}
        </View>
        <View style={styles.vendorDetails}>
          <Text style={styles.vendorName}>
            {vendor.profile_info?.business_name || 'Vendor'}
          </Text>
          <Text style={styles.vendorAddress}>
            {vendor.profile_info?.address || 'No address provided'}
          </Text>
          
          <View style={styles.vendorBadges}>
            <View style={styles.vendorBadge}>
              <Text style={styles.vendorBadgeText}>Dairy</Text>
            </View>
            <View style={styles.vendorBadge}>
              <Text style={styles.vendorBadgeText}>Verified</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={item => item.product_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderVendorHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products available from this vendor</Text>
          </View>
        }
      />
      
      <Animated.View 
        style={[
          styles.cartSummary,
          {
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [200, 0]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.cartInfo}>
          <View>
            <Text style={styles.cartText}>
              {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.cartPrice}>₹{getTotalPrice().toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.orderButton}
            onPress={handlePlaceOrder}
          >
            <Text style={styles.orderButtonText}>Place Order</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9f9f9',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  vendorHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
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
  vendorImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    marginRight: 16,
  },
  vendorImage: {
    width: '100%',
    height: '100%',
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vendorAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  vendorBadges: {
    flexDirection: 'row',
  },
  vendorBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  vendorBadgeText: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
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
  productContent: {
    flexDirection: 'row',
    padding: 16,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productImage: {
    width: 80,
    height: 80,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 18,
    color: '#4e9af1',
    fontWeight: 'bold',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#4e9af1',
  },
  removeButton: {
    backgroundColor: '#4e9af1',
  },
  disabledButton: {
    backgroundColor: '#c5d7f0',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityContainer: {
    width: 36,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemTotal: {
    backgroundColor: '#f5f9ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  itemTotalText: {
    fontSize: 14,
    color: '#4e9af1',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cartSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cartInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  cartText: {
    fontSize: 14,
    color: '#666',
  },
  cartPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  orderButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProductListScreen;
