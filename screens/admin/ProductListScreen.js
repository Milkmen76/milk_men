import React, { useState, useEffect } from 'react';
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
  StatusBar,
  Platform
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

// Image mapping for predefined product images
const imageMap = {
  'milk1.jpg': require('../../assets/milk-icon.png'),
  'milk2.jpg': require('../../assets/milk-icon.png'),
};

const ProductListScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      
      // Load all products
      const allProducts = await localData.getProducts();
      setProducts(allProducts);
      
      // Load vendors for matching with products
      const allVendors = await localData.getUsers();
      const vendorMap = {};
      allVendors.forEach(vendor => {
        if (vendor.role === 'vendor') {
          vendorMap[vendor.id] = vendor.name;
        }
      });
      setVendors(vendorMap);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${product.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setRefreshing(true);
              await localData.deleteProduct(product.product_id);
              // Refresh products list
              loadData();
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            } finally {
              setRefreshing(false);
            }
          }
        }
      ]
    );
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <Image 
        source={imageMap[item.image] || require('../../assets/milk-icon.png')}
        style={styles.productImage}
        resizeMode="contain"
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
        <Text style={styles.vendorName}>
          Vendor: {vendors[item.vendor_id] || 'Unknown'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteProduct(item)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeaderButtons = () => (
    <View style={styles.headerButtons}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('VendorApprovalScreen')}
      >
        <Text style={styles.navButtonText}>Approvals</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('UserListScreen')}
      >
        <Text style={styles.navButtonText}>Users</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('TransactionListScreen')}
      >
        <Text style={styles.navButtonText}>Transactions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, { backgroundColor: '#4e9af1' }]}
        onPress={() => navigation.navigate('ProductListScreen')}
      >
        <Text style={[styles.navButtonText, { color: '#fff' }]}>Products</Text>
      </TouchableOpacity>
    </View>
  );

  const getFilteredProducts = () => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => {
      const productName = product.name?.toLowerCase() || '';
      const vendorName = vendors[product.vendor_id]?.toLowerCase() || '';
      const category = product.category?.toLowerCase() || '';
      
      return productName.includes(query) || 
             vendorName.includes(query) || 
             category.includes(query);
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>All Products</Text>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', onPress: logout, style: 'destructive' }
                ]
              );
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        {renderHeaderButtons()}
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearch} 
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {getFilteredProducts().length > 0 ? (
        <FlatList
          data={getFilteredProducts()}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={loadData}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'No products match your search criteria' : 'There are no products in the system'}
          </Text>
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    color: '#666'
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_S,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2)
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M
  },
  title: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333'
  },
  signOutButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#ff5252',
    minHeight: verticalScale(30),
    justifyContent: 'center',
    alignItems: 'center'
  },
  signOutText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
  },
  headerButtons: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.PADDING_S,
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  navButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    marginHorizontal: SIZES.PADDING_XS,
    marginBottom: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#f0f0f0',
    minWidth: scale(70),
    minHeight: verticalScale(32),
    justifyContent: 'center',
    alignItems: 'center'
  },
  navButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
  },
  listContainer: {
    padding: SIZES.PADDING_M
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    marginBottom: SIZES.PADDING_M,
    alignItems: 'center',
    ...getShadowStyles(2)
  },
  productImage: {
    width: scale(60),
    height: scale(60),
    marginRight: SIZES.PADDING_M
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
    marginBottom: SIZES.PADDING_XS
  },
  productPrice: {
    fontSize: SIZES.SUBTITLE,
    color: '#4e9af1',
    fontWeight: 'bold',
    marginBottom: SIZES.PADDING_XS
  },
  vendorName: {
    fontSize: SIZES.CAPTION,
    color: '#666'
  },
  deleteButton: {
    backgroundColor: '#d9534f',
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    minHeight: verticalScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadowStyles(1)
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: SIZES.CAPTION,
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_L
  },
  emptyText: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S
  },
  emptySubtext: {
    fontSize: SIZES.BODY,
    color: '#666',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_M
  },
  searchContainer: {
    padding: SIZES.PADDING_M,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative'
  },
  searchInput: {
    height: SIZES.INPUT_HEIGHT,
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_S,
    paddingHorizontal: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#333',
    paddingRight: 30
  },
  clearSearch: {
    position: 'absolute',
    right: 25,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  clearSearchButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    backgroundColor: '#4e9af1',
    borderRadius: SIZES.RADIUS_S,
    minHeight: SIZES.BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadowStyles(2)
  }
});

export default ProductListScreen;
