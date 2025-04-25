import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

// Function to map image names to require statements
const getImageSource = (imageName) => {
  const defaultImage = require('../../assets/milk-icon.png');
  
  if (!imageName) return defaultImage;
  
  // For locally stored images or base64 strings
  if (imageName.startsWith('data:')) {
    return { uri: imageName };
  }
  
  // Default fallback
  return defaultImage;
};

const ProductListScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (!user || !user.id) {
        console.error('User not found');
        return;
      }
      
      // Fetch products for current vendor
      const vendorProducts = await localData.getProductsByVendor(user.id);
      setProducts(vendorProducts || []);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );
  
  const handleAddNewProduct = () => {
    navigation.navigate('ProductCreate');
  };
  
  const handleEditProduct = (product) => {
    // For future implementation
    Alert.alert('Edit Product', `Edit functionality for ${product.name} coming soon`);
  };
  
  const handleDeleteProduct = async (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await localData.deleteProduct(product.product_id);
              loadProducts(); // Reload the list
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };
  
  const renderProductItem = ({ item }) => {
    // Convert base64 image data if available
    const imageSource = item.image_base64
      ? { uri: `data:image/jpeg;base64,${item.image_base64}` }
      : getImageSource(item.image);
      
    return (
      <View style={styles.productCard}>
        <Image 
          source={imageSource}
          style={styles.productImage}
          resizeMode="contain"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productStock}>Stock: {item.stock} {item.unit || 'units'}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditProduct(item)}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(item)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Products</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddNewProduct}
          >
            <Text style={styles.addButtonText}>+ Add Product</Text>
          </TouchableOpacity>
        </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
        </View>
      ) : (
        <>
          {products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={item => item.product_id}
              contentContainerStyle={styles.productList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/milk-icon.png')}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>No products yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first product to start selling
              </Text>
              <TouchableOpacity 
                style={styles.emptyAddButton}
                onPress={handleAddNewProduct}
              >
                <Text style={styles.emptyAddButtonText}>Add New Product</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_M,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2),
  },
  headerTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_L,
    minHeight: verticalScale(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.CAPTION,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productList: {
    padding: SIZES.PADDING_M,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    ...getShadowStyles(2),
  },
  productImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: SIZES.RADIUS_M,
    backgroundColor: '#f0f8ff',
    marginRight: SIZES.PADDING_M,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: '600',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  productPrice: {
    fontSize: SIZES.BODY,
    fontWeight: '700',
    color: '#4e9af1',
    marginBottom: SIZES.PADDING_XS,
  },
  productCategory: {
    fontSize: SIZES.CAPTION,
    color: '#777',
    marginBottom: SIZES.PADDING_XS,
  },
  productStock: {
    fontSize: SIZES.CAPTION,
    color: '#777',
  },
  actionButtons: {
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    marginBottom: SIZES.PADDING_S,
    alignItems: 'center',
    minWidth: scale(60),
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#f0f8ff',
  },
  deleteButton: {
    backgroundColor: '#fff0f0',
  },
  buttonText: {
    fontSize: SIZES.CAPTION,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_L,
  },
  emptyImage: {
    width: scale(100),
    height: scale(100),
    opacity: 0.5,
    marginBottom: SIZES.PADDING_L,
  },
  emptyText: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S,
  },
  emptySubtext: {
    fontSize: SIZES.BODY,
    color: '#777',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_L,
  },
  emptyAddButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_M,
    paddingHorizontal: SIZES.PADDING_L,
    borderRadius: SIZES.RADIUS_M,
    minHeight: SIZES.BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAddButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: SIZES.BODY,
  },
});

export default ProductListScreen; 