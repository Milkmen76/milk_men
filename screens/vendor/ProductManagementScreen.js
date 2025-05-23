import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';
import * as ImagePicker from 'expo-image-picker';

// Image mapping for predefined product images
const imageOptions = [
  { label: 'Full Cream Milk', value: 'milk1.jpg' },
  { label: 'Skimmed Milk', value: 'milk2.jpg' },
];

const imageMap = {
  'milk1.jpg': require('../../assets/milk-icon.png'),
  'milk2.jpg': require('../../assets/milk-icon.png'),
};

const ProductManagementScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // New product form state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImage, setProductImage] = useState('milk1.jpg');
  const [productImageBase64, setProductImageBase64] = useState(null);
  const [localImageUri, setLocalImageUri] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      const vendorProducts = await localData.getProductsByVendor(user.id);
      setProducts(vendorProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const selectProductImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant permission to access your photos');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const source = { uri: result.assets[0].uri };
        console.log('Image selected successfully. URI:', source.uri);
        
        // Get base64 data
        const base64 = result.assets[0].base64;
        console.log('Base64 data length:', base64 ? base64.length : 'No data');
        
        setLocalImageUri(source.uri);
        setProductImageBase64(base64);
        setProductImage(`custom_${Date.now()}.jpg`);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleAddProduct = () => {
    // Reset form
    setEditingProduct(null);
    setProductName('');
    setProductPrice('');
    setProductImage('milk1.jpg');
    setProductImageBase64(null);
    setLocalImageUri(null);
    setModalVisible(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductImage(product.image);
    setProductImageBase64(product.image_base64);
    setLocalImageUri(null);
    setModalVisible(true);
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
              loadProducts();
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

  const validateProductForm = () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return false;
    }
    
    const price = parseFloat(productPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }
    
    return true;
  };

  const handleSaveProduct = async () => {
    if (!validateProductForm()) return;
    
    setSavingProduct(true);
    
    try {
      const priceValue = parseFloat(productPrice);
      
      // Log image details before saving
      console.log('Saving product with image details:');
      console.log('Image name:', productImage);
      console.log('Has base64 data:', !!productImageBase64);
      console.log('Base64 data length:', productImageBase64 ? productImageBase64.length : 0);
      
      if (editingProduct) {
        // Update existing product
        await localData.updateProduct(editingProduct.product_id, {
          name: productName,
          price: priceValue,
          image: productImage,
          image_base64: productImageBase64
        });
      } else {
        // Add new product
        await localData.addProduct({
          vendor_id: user.id,
          name: productName,
          price: priceValue,
          image: productImage,
          image_base64: productImageBase64
        });
      }
      
      // Close modal and refresh products list
      setModalVisible(false);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const getProductImage = (item) => {
    // Use local image URI if available (for newly selected image)
    if (editingProduct && editingProduct.product_id === item.product_id && localImageUri) {
      return { uri: localImageUri };
    }
    
    // Use base64 image if available
    if (item.image_base64) {
      return { uri: `data:image/jpeg;base64,${item.image_base64}` };
    }
    
    // Fall back to predefined image
    return imageMap[item.image] || imageMap['milk1.jpg'];
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <Image 
        source={getProductImage(item)}
        style={styles.productImage}
        resizeMode="contain"
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
      </View>
      
      <View style={styles.productActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditProduct(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteProduct(item)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProductForm = () => (
    <ScrollView style={styles.formScrollView}>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Product Name*</Text>
        <TextInput
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
          placeholder="Enter product name"
          placeholderTextColor="#aaa"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Price (₹)*</Text>
        <TextInput
          style={styles.input}
          value={productPrice}
          onChangeText={setProductPrice}
          placeholder="Enter price"
          placeholderTextColor="#aaa"
          keyboardType="decimal-pad"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Product Image</Text>
        
        <View style={styles.imageUploadContainer}>
          <View style={styles.currentImageContainer}>
            {localImageUri ? (
              <Image 
                source={{ uri: localImageUri }}
                style={styles.currentProductImage}
                resizeMode="contain"
              />
            ) : productImageBase64 ? (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${productImageBase64}` }}
                style={styles.currentProductImage}
                resizeMode="contain"
              />
            ) : (
              <Image 
                source={imageMap[productImage]}
                style={styles.currentProductImage}
                resizeMode="contain"
              />
            )}
          </View>
          
          <TouchableOpacity
            style={styles.uploadImageButton}
            onPress={selectProductImage}
            activeOpacity={0.7}
          >
            <Text style={styles.uploadImageButtonText}>
              {localImageUri || productImageBase64 ? 'Change Image' : 'Upload Image'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
          disabled={savingProduct}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.saveButton, savingProduct && styles.disabledButton]}
          onPress={handleSaveProduct}
          disabled={savingProduct}
        >
          {savingProduct ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Product</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
      <View style={styles.header}>
        <Text style={styles.title}>My Products</Text>
      </View>
      
      {/* Centered Add Product Button */}
      <TouchableOpacity 
        style={styles.centeredAddButton}
        onPress={handleAddProduct}
      >
        <Text style={styles.addButtonText}>+ Add New Product</Text>
      </TouchableOpacity>
      
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={styles.productList}
          refreshing={refreshing}
          onRefresh={loadProducts}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products added yet</Text>
          <Text style={styles.emptySubtext}>Add your first product using the button above</Text>
        </View>
      )}
      
      {/* Add/Edit Product Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>
            
            {renderProductForm()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4e9af1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  centeredAddButton: {
    backgroundColor: '#4e9af1',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  productList: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
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
  productActions: {
    flexDirection: 'column',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#e3f2fd',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  formScrollView: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  imageUploadContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentImageContainer: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  currentProductImage: {
    width: 140,
    height: 140,
  },
  uploadImageButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 200,
  },
  uploadImageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4e9af1',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default ProductManagementScreen;
