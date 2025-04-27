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
  if (!product) {
    console.log('Product object is undefined or null');
    return require('../../assets/milk-icon.png');
  }
  
  // Log image details for debugging
  console.log(`Getting image for product: ${product.name}, Image: ${product.image}`);
  
  if (product.image_base64 && product.image_base64.length > 100) {
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

  // Add this function to get vendor avatar
  const getVendorAvatar = () => {
    if (!vendor) {
      console.log('Vendor object is undefined or null');
      return require('../../assets/milk-icon.png');
    }
    
    console.log(`Getting avatar for vendor: ${vendor.profile_info?.business_name || vendor.name || 'Unknown'}`);
    
    if (vendor.profile_info?.custom_avatar_base64 && vendor.profile_info.custom_avatar_base64.length > 100) {
      console.log(`Using custom avatar base64, data length: ${vendor.profile_info.custom_avatar_base64.length}`);
      return { uri: `data:image/jpeg;base64,${vendor.profile_info.custom_avatar_base64}` };
    }
    
    // Default avatars
    const avatarImages = {
      'milk-icon.png': require('../../assets/milk-icon.png'),
      'icon.png': require('../../assets/icon.png'),
      'splash-icon.png': require('../../assets/splash-icon.png'),
      'adaptive-icon.png': require('../../assets/adaptive-icon.png'),
      'favicon.png': require('../../assets/favicon.png'),
    };
    
    if (vendor.profile_info?.avatar && avatarImages[vendor.profile_info.avatar]) {
      console.log(`Using predefined avatar: ${vendor.profile_info.avatar}`);
      return avatarImages[vendor.profile_info.avatar];
    }
    
    console.log('Using fallback avatar');
    return require('../../assets/milk-icon.png');
  };
  
  // Add this function to get business logo
  const getBusinessLogo = () => {
    if (!vendor) {
      console.log('Vendor object is undefined or null');
      return require('../../assets/milk-icon.png');
    }
    
    console.log(`Getting business logo for: ${vendor.profile_info?.business_name || vendor.name || 'Unknown'}`);
    
    if (vendor.profile_info?.logo_base64 && vendor.profile_info.logo_base64.length > 100) {
      console.log(`Using business logo base64, data length: ${vendor.profile_info.logo_base64.length}`);
      return { uri: `data:image/jpeg;base64,${vendor.profile_info.logo_base64}` };
    }
    
    console.log('Using fallback business logo');
    return require('../../assets/milk-icon.png');
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
        <View style={styles.vendorInfo}>
          <View style={styles.vendorProfilePic}>
            <Image 
              source={getVendorAvatar()}
              style={styles.vendorAvatar}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.vendorDetails}>
            <Text style={styles.vendorName}>{vendor.profile_info?.business_name || vendor.name || 'Vendor'}</Text>
            <Text style={styles.vendorAddress}>{vendor.profile_info?.address || 'No address provided'}</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>⭐ 4.5</Text>
              <Text style={styles.reviewCount}>(24 reviews)</Text>
            </View>
          </View>
        </View>
        
        {vendor.profile_info?.logo_base64 && (
          <View style={styles.businessLogoContainer}>
            <Image 
              source={getBusinessLogo()}
              style={styles.businessLogo}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={products}
            renderItem={renderProductItem}
            keyExtractor={item => item.product_id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No products available</Text>
              </View>
            }
            ListHeaderComponent={renderVendorHeader()}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Cart button */}
          <Animated.View 
            style={[
              styles.cartButtonContainer,
              {
                transform: [
                  {
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.cartButton}
              onPress={handlePlaceOrder}
              activeOpacity={0.8}
            >
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
              </View>
              <Text style={styles.cartButtonText}>Place Order</Text>
              <Text style={styles.cartTotal}>₹{getTotalPrice().toFixed(2)}</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
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
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorProfilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  vendorAvatar: {
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
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9800',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
  },
  businessLogoContainer: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  businessLogo: {
    width: 100,
    height: 60,
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
  emptyStateContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cartButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4e9af1',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cartBadge: {
    backgroundColor: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cartBadgeText: {
    color: '#4e9af1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartTotal: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductListScreen;
