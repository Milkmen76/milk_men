import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const windowWidth = Dimensions.get('window').width;

// Helper function to get vendor image
const getVendorImage = (vendor) => {
  console.log(`Getting image for vendor: ${vendor.businessName}`);
  
  if (vendor.logo_base64) {
    console.log(`Using base64 logo for ${vendor.businessName}, data length: ${vendor.logo_base64.length}`);
    return { uri: `data:image/jpeg;base64,${vendor.logo_base64}` };
  }
  
  console.log(`Using fallback logo for ${vendor.businessName}`);
  return require('../../assets/milk-icon.png');
};

// Simple date formatting function
const formatSimpleDate = (date) => {
  if (!date) return '';
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
};

// Image mapping for predefined product images
const imageMap = {
  "milk1.jpg": require('../../assets/milk-icon.png'),
  "milk2.jpg": require('../../assets/milk-icon.png'),
};

// Get product image from base64 or default
const getProductImage = (product) => {
  if (!product) return require('../../assets/milk-icon.png');
  
  console.log(`Getting image for product: ${product.name || 'unknown'}`);
  
  if (product.image_base64) {
    console.log(`Using base64 image for product, data length: ${product.image_base64.length}`);
    return { uri: `data:image/jpeg;base64,${product.image_base64}` };
  }
  return imageMap[product.image] || require('../../assets/milk-icon.png');
};

const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [vendors, setVendors] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category products modal state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoryVendors, setCategoryVendors] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Fetch vendors from local data
  const fetchVendors = async () => {
    try {
      // Get all users and filter for approved vendors
      const allUsers = await localData.getUsers();
      const approvedVendors = allUsers.filter(
        u => u.role === 'vendor' && u.approval_status === 'approved'
      );
      
      console.log(`Found ${approvedVendors.length} approved vendors`);
      
      // Enhance vendor data with additional info
      const enhancedVendors = approvedVendors.map(vendor => {
        console.log(`Processing vendor: ${vendor.name}`);
        console.log(`Vendor has logo: ${!!vendor.profile_info?.logo_base64}`);
        
        return {
          id: vendor.id,
          name: vendor.name,
          businessName: vendor.profile_info?.business_name || 'Milk Vendor',
          // Use vendor's own logo if available
          logo_base64: vendor.profile_info?.logo_base64 || null,
          description: vendor.profile_info?.description || 'Fresh dairy products',
          rating: vendor.profile_info?.rating || (Math.random() * 2 + 3).toFixed(1), // Random rating between 3-5
          location: { 
            city: vendor.profile_info?.address?.split(',')?.pop()?.trim() || 'Bhawarkua' 
          },
          distance: (Math.random() * 3 + 0.5).toFixed(1), // Random distance 0.5-3.5 km
          yearsInBusiness: `${Math.floor(Math.random() * 5) + 1} years` // Random 1-5 years
        };
      });
      
      setVendors(enhancedVendors);
    } catch (error) {
      console.error('Error fetching vendors: ', error);
    }
  };

  // Fetch subscriptions from local data
  const fetchSubscriptions = async () => {
    if (!user?.id) return;
    
    try {
      // Get user's subscriptions
      const userSubs = await localData.getSubscriptionsByUser(user.id);
      if (!userSubs || userSubs.length === 0) {
        setSubscriptions([]);
        return;
      }
      
      // Get vendors for the subscriptions
      const subsWithVendors = await Promise.all(
        userSubs.map(async (sub) => {
          const vendor = await localData.getUserById(sub.vendor_id);
          const formattedSub = {
            ...sub,
            endDate: new Date(sub.end_date),
            nextDelivery: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Tomorrow
            planName: sub.type.charAt(0).toUpperCase() + sub.type.slice(1) + ' Plan',
            vendor: vendor ? {
              id: vendor.id,
              businessName: vendor.profile_info?.business_name || 'Milk Vendor',
              logo_base64: vendor.profile_info?.logo_base64 || null
            } : null
          };
          return formattedSub;
        })
      );
      
      setSubscriptions(subsWithVendors.filter(sub => sub.vendor !== null));
    } catch (error) {
      console.error('Error fetching subscriptions: ', error);
    }
  };

  // Fetch all products for categories
  const fetchProducts = async () => {
    try {
      const allProducts = await localData.getProducts();
      // Add a category field if missing
      const productsWithCategories = (allProducts || []).map(product => {
        if (!product.category) {
          // Assign a category based on product name
          const name = product.name.toLowerCase();
          if (name.includes('milk')) return { ...product, category: 'Milk' };
          if (name.includes('curd')) return { ...product, category: 'Curd' };
          if (name.includes('ghee')) return { ...product, category: 'Ghee' };
          return { ...product, category: 'Other' };
        }
        return product;
      });
      
      setProducts(productsWithCategories);
      
      // Update address from user profile
      if (user?.profile_info?.address) {
        setAddress(user.profile_info.address);
      } else {
        setAddress('');
      }
    } catch (error) {
      console.error('Error fetching products: ', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchVendors(), fetchSubscriptions(), fetchProducts()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const navigateToVendorProducts = (vendorId, vendorName) => {
    navigation.navigate('ProductList', { vendorId, vendorName });
  };

  const navigateToSubscriptionDetails = (subscription) => {
    navigation.navigate('SubscriptionDetailScreen', { subscription });
  };

  const formatDate = (date) => {
    return formatSimpleDate(date);
  };

  // Get unique product categories
  const getUniqueCategories = () => {
    const categories = [];
    const uniqueNames = new Set();
    
    products.forEach(product => {
      if (product.category && !uniqueNames.has(product.category)) {
        uniqueNames.add(product.category);
        categories.push({
          id: product.product_id,
          name: product.category,
          image: getProductImage(product)
        });
      }
    });
    
    // If no categories found, use default ones
    if (categories.length === 0) {
      return [
        { id: '1', name: 'Milk', image: require('../../assets/milk-icon.png') },
        { id: '2', name: 'Curd', image: require('../../assets/milk-icon.png') },
        { id: '3', name: 'Ghee', image: require('../../assets/milk-icon.png') },
      ];
    }
    
    return categories.slice(0, 3); // Limit to 3 categories
  };

  const handleAddressPress = () => {
    navigation.navigate('ProfileTab', { focusOnAddress: true });
  };

  const handleProfilePress = () => {
    navigation.navigate('ProfileTab');
  };

  const handleCategoryPress = (category) => {
    setCategoryLoading(true);
    setCategoryModalVisible(true);
    setSelectedCategory(category);
    
    // Filter products by the selected category
    const filtered = products.filter(product => {
      return product.category === category;
    });
    
    setCategoryProducts(filtered);
    
    // Create a map of vendor names for quick lookup
    const vendorMap = {};
    vendors.forEach(vendor => {
      vendorMap[vendor.id] = vendor.businessName || vendor.name;
    });
    
    setCategoryVendors(vendorMap);
    
    // Reset selected products
    setSelectedProducts({});
    
    // Simulate loading
    setTimeout(() => {
      setCategoryLoading(false);
    }, 500);
  };
  
  // Filter vendors based on search query
  const getFilteredVendors = () => {
    if (!searchQuery.trim()) return vendors;
    
    const query = searchQuery.toLowerCase();
    return vendors.filter(vendor => {
      const businessName = vendor.businessName?.toLowerCase() || '';
      const name = vendor.name?.toLowerCase() || '';
      const description = vendor.description?.toLowerCase() || '';
      
      return businessName.includes(query) || 
             name.includes(query) || 
             description.includes(query);
    });
  };
  
  // Filter products based on search query
  const getFilteredProducts = () => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const description = product.description?.toLowerCase() || '';
      const category = product.category?.toLowerCase() || '';
      
      return name.includes(query) || 
             description.includes(query) || 
             category.includes(query);
    });
  };

  const handleSeeAllPress = () => {
    navigation.navigate('VendorListTab');
  };

  const getVendorName = (vendorId) => {
    const vendor = categoryVendors[vendorId];
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
    return categoryProducts.reduce((total, product) => {
      const qty = selectedProducts[product.product_id] || 0;
      return total + (product.price * qty);
    }, 0);
  };

  const handleViewVendor = (vendorId) => {
    setCategoryModalVisible(false);
    navigation.navigate('ProductList', { 
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
    
    categoryProducts.forEach(product => {
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
    setCategoryModalVisible(false);
    navigation.navigate('OrderScreen', {
      vendorId,
      vendorName: getVendorName(vendorId),
      products: productsByVendor[vendorId],
      totalPrice: getTotalPrice()
    });
  };

  const renderSuggestedVendorItem = ({ item, index }) => {
    if (index > 1) return null; // Only show first two vendors in suggested section
    
    const imageSource = getVendorImage(item);
    console.log(`Rendering suggested vendor: ${item.businessName}, has logo: ${!!item.logo_base64}`);
    
    return (
      <TouchableOpacity
        style={styles.suggestedVendorCard}
        onPress={() => navigateToVendorProducts(item.id, item.businessName)}
      >
        <Image 
          source={imageSource}
          style={styles.suggestedVendorImage} 
          resizeMode="cover"
        />
        <View style={styles.suggestedVendorOverlay}>
          <Text style={styles.suggestedVendorName}>{item.businessName}</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <Text key={star} style={styles.starIcon}>★</Text>
            ))}
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              {item.location?.city || 'Bhawarkua' }
            </Text>
            <Text style={styles.distanceText}>
              {item.distance || '1.5'} Km
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
    >
      <Image source={item.image} style={styles.categoryImage} />
      <View style={styles.categoryOverlay}>
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPopularVendorItem = ({ item, index }) => {
    const imageSource = getVendorImage(item);
    console.log(`Rendering popular vendor: ${item.businessName}, has logo: ${!!item.logo_base64}`);
    
    return (
      <View style={styles.popularVendorContainer}>
        <TouchableOpacity
          style={styles.popularVendorCard}
          onPress={() => navigateToVendorProducts(item.id, item.businessName)}
        >
          <Image 
            source={imageSource}
            style={styles.popularVendorImage} 
          />
        </TouchableOpacity>
        <Text style={styles.popularVendorName}>{item.businessName}</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <Text key={star} style={styles.smallStarIcon}>★</Text>
          ))}
        </View>
        <View style={styles.vendorInfoRow}>
          <Text style={styles.vendorDistance}>{item.distance || '1.4 km'}</Text>
          <View style={styles.yearsContainer}>
            <Text style={styles.yearsText}>{item.yearsInBusiness || '2 years'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryProductItem = ({ item }) => {
    const quantity = selectedProducts[item.product_id] || 0;
    const isInCart = quantity > 0;
    
    return (
      <View style={styles.categoryProductCard}>
        <View style={styles.categoryProductRow}>
          <View style={styles.categoryProductImageContainer}>
            <Image 
              source={getProductImage(item)}
              style={styles.categoryProductImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.categoryProductInfo}>
            <Text style={styles.categoryProductName}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => handleViewVendor(item.vendor_id)}
            >
              <Text style={styles.categoryVendorName}>By: {getVendorName(item.vendor_id)}</Text>
            </TouchableOpacity>
            <Text style={styles.categoryProductPrice}>₹{item.price.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.categoryProductActions}>
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
          
          {isInCart && (
            <Text style={styles.itemTotal}>₹{(item.price * quantity).toFixed(2)}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderProductItem = ({ item }) => {
    return (
      <View style={styles.productCard}>
        <View style={styles.productImageContainer}>
          <Image 
            source={getProductImage(item)}
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
          
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigateToVendorProducts(item.vendor_id, getVendorName(item.vendor_id))}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        
        <View style={styles.addressHeader}>
          <TouchableOpacity style={styles.addressButton} onPress={handleAddressPress}>
            {address ? (
              <>
                <Text style={styles.addressButtonText} numberOfLines={1} ellipsizeMode="tail">
                  {address}
                </Text>
                <Text style={styles.editIcon}>✏️</Text>
              </>
            ) : (
              <>
                <Text style={styles.addressButtonText}>Add Delivery Address</Text>
                <Text style={styles.plusIcon}>+</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Vendor, Product"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            placeholderTextColor="#999"
          />
          <Text style={styles.searchIcon}>🔍</Text>
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
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? 'Search Results' : 'Suggested Vendors'}
          </Text>
          {getFilteredVendors().length > 0 ? (
            <FlatList
              data={getFilteredVendors()}
              renderItem={renderSuggestedVendorItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedVendorList}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No vendors available at the moment.</Text>
            </View>
          )}
        </View>
        
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <FlatList
              data={getUniqueCategories()}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            />
          </View>
        )}
        
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? 'Product Results' : 'Popular Products'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity onPress={handleSeeAllPress}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          {vendors.length > 0 ? (
            <FlatList
              data={searchQuery ? getFilteredProducts() : products.slice(0, 10)}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.product_id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productList}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No products available at the moment.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Category Products Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={categoryModalVisible}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedCategory?.name || 'Category'} Products</Text>
          </View>
          
          {categoryLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4e9af1" />
            </View>
          ) : (
            <>
              {categoryProducts.length > 0 ? (
                <FlatList
                  data={categoryProducts}
                  renderItem={renderCategoryProductItem}
                  keyExtractor={item => item.product_id}
                  contentContainerStyle={styles.modalListContent}
                />
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No products found in this category</Text>
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
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    maxWidth: windowWidth - 120, // Limit width to prevent overflow
  },
  plusIcon: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  editIcon: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  searchContainer: {
    position: 'relative',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    paddingHorizontal: 16,
    color: '#333',
  },
  searchIcon: {
    fontSize: 16,
    color: '#888',
    position: 'absolute',
    right: 16,
  },
  clearSearch: {
    position: 'absolute',
    right: 40,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    fontSize: 10,
    color: '#333',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4e9af1',
    fontWeight: '500',
  },
  suggestedVendorList: {
    paddingVertical: 10,
  },
  suggestedVendorCard: {
    width: windowWidth * 0.65,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 15,
    position: 'relative',
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
  suggestedVendorImage: {
    width: '100%',
    height: '100%',
  },
  suggestedVendorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  suggestedVendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  starIcon: {
    color: '#FFD700',
    fontSize: 16,
    marginRight: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#fff',
  },
  distanceText: {
    fontSize: 14,
    color: '#fff',
  },
  categoryList: {
    paddingVertical: 10,
  },
  categoryCard: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 15,
    position: 'relative',
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
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  popularVendorList: {
    paddingVertical: 10,
  },
  popularVendorContainer: {
    width: 140,
    marginRight: 15,
    alignItems: 'center',
  },
  popularVendorCard: {
    width: 140,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  popularVendorImage: {
    width: '100%',
    height: '100%',
  },
  popularVendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  smallStarIcon: {
    color: '#FFD700',
    fontSize: 14,
    marginRight: 1,
  },
  vendorInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 5,
  },
  vendorDistance: {
    fontSize: 14,
    color: '#777',
  },
  yearsContainer: {
    backgroundColor: '#FFE082',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  yearsText: {
    fontSize: 12,
    color: '#333',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4e9af1',
    paddingVertical: 15,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    marginRight: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
  },
  modalListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    width: 180,
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
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  vendorNameText: {
    fontSize: 14,
    color: '#4e9af1',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#ff6b6b',
  },
  addButton: {
    backgroundColor: '#4e9af1',
  },
  disabledButton: {
    opacity: 0.5,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityContainer: {
    width: 40,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cartInfo: {
    flex: 1,
  },
  cartText: {
    fontSize: 14,
    color: '#666',
  },
  cartPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  viewButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  categoryProductCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoryProductRow: {
    flexDirection: 'row',
  },
  categoryProductImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryProductImage: {
    width: 60,
    height: 60,
  },
  categoryProductInfo: {
    flex: 1,
  },
  categoryProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryVendorName: {
    fontSize: 14,
    color: '#4e9af1',
    marginBottom: 6,
  },
  categoryProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryProductActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4e9af1',
  },
});

export default HomeScreen;
