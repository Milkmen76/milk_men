import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

// Image mapping for predefined product images
const imageMap = {
  "milk1.jpg": require('../../assets/milk-icon.png'),
  "milk2.jpg": require('../../assets/milk-icon.png'),
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

  const renderProductItem = ({ item }) => (
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
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleRemoveFromCart(item)}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>
            {selectedProducts[item.product_id] || 0}
          </Text>
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleAddToCart(item)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {vendor && (
        <View style={styles.vendorHeader}>
          <Text style={styles.vendorName}>
            {vendor.profile_info?.business_name || 'Vendor'}
          </Text>
          <Text style={styles.vendorAddress}>
            {vendor.profile_info?.address || 'No address provided'}
          </Text>
        </View>
      )}
      
      <Text style={styles.headerTitle}>Available Products</Text>
      
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
          <Text style={styles.emptyText}>No products available from this vendor</Text>
        </View>
      )}
      
      {getTotalItems() > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartText}>
              {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.cartPrice}>${getTotalPrice().toFixed(2)}</Text>
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
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9f9f9',
    padding: 16 
  },
  vendorHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  vendorAddress: {
    fontSize: 14,
    color: '#666'
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  listContent: {
    paddingBottom: 100
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  productImage: {
    width: 60,
    height: 60
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333'
  },
  productPrice: {
    fontSize: 16,
    color: '#4e9af1',
    fontWeight: 'bold',
    marginBottom: 12
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4e9af1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  quantityText: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  cartSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5
  },
  cartInfo: {
    flex: 1
  },
  cartText: {
    fontSize: 14,
    color: '#666'
  },
  cartPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  orderButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default ProductListScreen;
