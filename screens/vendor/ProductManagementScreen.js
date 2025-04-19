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
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

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

  const handleAddProduct = () => {
    // Reset form
    setEditingProduct(null);
    setProductName('');
    setProductPrice('');
    setProductImage('milk1.jpg');
    setModalVisible(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductImage(product.image);
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
      
      if (editingProduct) {
        // Update existing product
        await localData.updateProduct(editingProduct.product_id, {
          name: productName,
          price: priceValue,
          image: productImage
        });
      } else {
        // Add new product
        await localData.addProduct({
          vendor_id: user.id,
          name: productName,
          price: priceValue,
          image: productImage
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

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <Image 
        source={imageMap[item.image] || require('../../assets/milk-icon.png')}
        style={styles.productImage}
        resizeMode="contain"
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>${parseFloat(item.price).toFixed(2)}</Text>
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
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddProduct}
        >
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>
      
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
            
            <ScrollView style={styles.formContainer}>
              <Text style={styles.inputLabel}>Product Name</Text>
              <TextInput
                style={styles.textInput}
                value={productName}
                onChangeText={setProductName}
                placeholder="Enter product name"
              />
              
              <Text style={styles.inputLabel}>Price ($)</Text>
              <TextInput
                style={styles.textInput}
                value={productPrice}
                onChangeText={setProductPrice}
                placeholder="Enter price"
                keyboardType="decimal-pad"
              />
              
              <Text style={styles.inputLabel}>Product Image</Text>
              <View style={styles.imageOptions}>
                {imageOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.imageOption,
                      productImage === option.value && styles.selectedImageOption
                    ]}
                    onPress={() => setProductImage(option.value)}
                  >
                    <Image
                      source={imageMap[option.value]}
                      style={styles.imageOptionPreview}
                      resizeMode="contain"
                    />
                    <Text style={styles.imageOptionLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={savingProduct}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProduct}
                disabled={savingProduct}
              >
                {savingProduct ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  addButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500'
  },
  productList: {
    padding: 16
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  productImage: {
    width: 50,
    height: 50,
    marginRight: 12
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  productPrice: {
    fontSize: 15,
    color: '#4e9af1',
    fontWeight: 'bold'
  },
  productActions: {
    flexDirection: 'row'
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginLeft: 8
  },
  editButton: {
    backgroundColor: '#f0ad4e'
  },
  deleteButton: {
    backgroundColor: '#d9534f'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center'
  },
  formContainer: {
    maxHeight: 400
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 15
  },
  imageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  imageOption: {
    width: '48%',
    margin: '1%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center'
  },
  selectedImageOption: {
    borderColor: '#4e9af1',
    backgroundColor: '#f0f8ff'
  },
  imageOptionPreview: {
    width: 60,
    height: 60,
    marginBottom: 8
  },
  imageOptionLabel: {
    fontSize: 14,
    color: '#333'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  modalButton: {
    flexGrow: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#4e9af1'
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500'
  }
});

export default ProductManagementScreen;
