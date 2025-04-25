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
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

// Image mapping for predefined product images
const imageMap = {
  "milk1.jpg": require('../../assets/milk-icon.png'),
  "milk2.jpg": require('../../assets/milk-icon.png'),
};

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

const CategoryProductsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { categoryName } = route.params || {};
  
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!categoryName) {
          setLoading(false);
          return;
        }
        
        // Fetch all products
        const allProducts = await localData.getProducts();
        
        // Filter products by category
        const categoryProducts = allProducts.filter(product => 
          (product.category || '').toLowerCase() === categoryName.toLowerCase() ||
          (product.name || '').toLowerCase().includes(categoryName.toLowerCase())
        );
        
        setProducts(categoryProducts);
        
        // Fetch vendor details for each product
        const vendorIds = [...new Set(categoryProducts.map(p => p.vendor_id))];
        const vendorData = {};
        
        for (const vid of vendorIds) {
          const vendor = await localData.getUserById(vid);
          if (vendor) {
            vendorData[vid] = vendor;
          }
        }
        
        setVendors(vendorData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryName]);

  const getVendorName = (vendorId) => {
    const vendor = vendors[vendorId];
    return vendor ? vendor.profile_info?.business_name || 'Vendor' : 'Unknown Vendor';
  };

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

  const handleViewVendor = (vendorId) => {
    navigation.navigate('ProductListScreen', { 
      vendorId, 
      vendorName: getVendorName(vendorId) 
    });
  };

  const handlePlaceOrder = () => {
    if (getTotalItems() === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return;
    }
    
    // Group products by vendor
    const productsByVendor = {};
    
    products.forEach(product => {
      const qty = selectedProducts[product.product_id] || 0;
      if (qty > 0) {
        if (!productsByVendor[product.vendor_id]) {
          productsByVendor[product.vendor_id] = [];
        }
        
        productsByVendor[product.vendor_id].push({
          ...product,
          quantity: qty
        });
      }
    });
    
    // If products from multiple vendors, show alert
    const vendorIds = Object.keys(productsByVendor);
    if (vendorIds.length > 1) {
      Alert.alert(
        'Multiple Vendors',
        'You have selected products from multiple vendors. Please place orders separately for each vendor.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Navigate to order screen with the selected products
    const vendorId = vendorIds[0];
    navigation.navigate('OrderScreen', {
      vendorId,
      vendorName: getVendorName(vendorId),
      products: productsByVendor[vendorId],
      totalPrice: getTotalPrice()
    });
  };

  const renderProductItem = ({ item }) => {
    const quantity = selectedProducts[item.product_id] || 0;
    const isInCart = quantity > 0;
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productImageContainer}>
          <Image 
            source={imageMap[item.image] || require('../../assets/milk-icon.png')}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <TouchableOpacity
            onPress={() => handleViewVendor(item.vendor_id)}
          >
            <Text style={styles.vendorNameText}>By: {getVendorName(item.vendor_id)}</Text>
          </TouchableOpacity>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
          
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{categoryName || 'Products'}</Text>
        <Text style={styles.productCount}>{products.length} products found</Text>
      </View>
      
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item.product_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found in this category</Text>
        </View>
      )}
      
      {getTotalItems() > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartInfo}>
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
      )}
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
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_M,
    paddingBottom: 0,
  },
  categoryHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    marginBottom: SIZES.PADDING_L,
    ...getShadowStyles(3),
  },
  categoryName: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
    textTransform: 'capitalize',
  },
  productCount: {
    fontSize: SIZES.CAPTION,
    color: '#666'
  },
  listContent: {
    paddingBottom: 80
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    flexDirection: 'row',
    ...getShadowStyles(2),
  },
  productImageContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: SIZES.RADIUS_M,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_M
  },
  productImage: {
    width: scale(60),
    height: scale(60)
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    marginBottom: SIZES.PADDING_XS,
    color: '#333'
  },
  vendorNameText: {
    fontSize: SIZES.CAPTION,
    color: '#4e9af1',
    marginBottom: SIZES.PADDING_S
  },
  productPrice: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_M
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quantityButton: {
    width: SIZES.ICON_BUTTON,
    height: SIZES.ICON_BUTTON,
    borderRadius: SIZES.RADIUS_ROUND,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: SIZES.ICON_BUTTON,
    minHeight: SIZES.ICON_BUTTON,
  },
  removeButton: {
    backgroundColor: '#ff6b6b'
  },
  addButton: {
    backgroundColor: '#4e9af1'
  },
  disabledButton: {
    opacity: 0.5
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold'
  },
  quantityContainer: {
    width: SIZES.ICON_BUTTON,
    alignItems: 'center'
  },
  quantityText: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333'
  },
  cartSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.PADDING_M,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: Platform.OS === 'ios' ? SIZES.PADDING_L : SIZES.PADDING_M,
    ...getShadowStyles(5),
  },
  cartInfo: {
    flex: 1
  },
  cartText: {
    fontSize: SIZES.CAPTION,
    color: '#666'
  },
  cartPrice: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333'
  },
  orderButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_L,
    borderRadius: SIZES.RADIUS_M,
    minHeight: SIZES.BUTTON_HEIGHT,
    minWidth: scale(120),
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: SIZES.BODY
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    paddingHorizontal: SIZES.PADDING_M,
  },
  loadingText: {
    marginTop: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: verticalScale(100)
  },
  emptyText: {
    fontSize: SIZES.BODY,
    color: '#666',
    textAlign: 'center'
  }
});

export default CategoryProductsScreen; 