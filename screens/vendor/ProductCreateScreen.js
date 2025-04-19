import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const ProductCreateScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    unit: 'litre',
  });
  const [imageUri, setImageUri] = useState(null);
  const [localImage, setLocalImage] = useState(null);

  // Categories for selection
  const categories = [
    { id: 'milk', name: 'Milk' },
    { id: 'curd', name: 'Curd' },
    { id: 'ghee', name: 'Ghee' },
    { id: 'paneer', name: 'Paneer' },
    { id: 'butter', name: 'Butter' },
    { id: 'cheese', name: 'Cheese' },
    { id: 'other', name: 'Other' },
  ];

  // Units for selection
  const units = [
    { id: 'litre', name: 'Litre' },
    { id: 'kg', name: 'Kg' },
    { id: 'gram', name: 'Gram' },
    { id: 'piece', name: 'Piece' },
    { id: 'packet', name: 'Packet' },
  ];

  const handleInputChange = (field, value) => {
    setProductData({
      ...productData,
      [field]: value
    });
  };

  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.7,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'An error occurred while selecting the image');
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        setImageUri(source.uri);
        setLocalImage({
          uri: response.assets[0].uri,
          type: response.assets[0].type,
          name: response.assets[0].fileName || 'product_image.jpg',
          base64: response.assets[0].base64
        });
      }
    });
  };

  const validateForm = () => {
    if (!productData.name) {
      Alert.alert('Missing Information', 'Please enter product name');
      return false;
    }
    if (!productData.price || isNaN(Number(productData.price))) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return false;
    }
    if (!productData.category) {
      Alert.alert('Missing Information', 'Please select a category');
      return false;
    }
    if (!productData.stock || isNaN(Number(productData.stock))) {
      Alert.alert('Invalid Stock', 'Please enter valid stock quantity');
      return false;
    }
    if (!imageUri) {
      Alert.alert('Missing Image', 'Please select a product image');
      return false;
    }
    return true;
  };

  const handleCreateProduct = async () => {
    if (!validateForm()) return;
    
    if (!user || user.role !== 'vendor') {
      Alert.alert('Error', 'Only vendors can create products');
      return;
    }
    
    setLoading(true);
    
    try {
      // Save image to local storage or cloud (In a real app)
      // For this demo, we'll use a filename convention and store the path
      const imageName = `product_${Date.now()}.jpg`;
      
      // Create product in local database
      const newProductData = {
        name: productData.name,
        description: productData.description || 'Fresh dairy product',
        price: Number(productData.price),
        category: productData.category,
        stock: Number(productData.stock),
        unit: productData.unit,
        vendor_id: user.id,
        image: imageName,
        image_base64: localImage.base64, // Store base64 for demo
        created_at: new Date().toISOString()
      };
      
      const product = await localData.addProduct(newProductData);
      
      if (!product) {
        throw new Error('Failed to create product');
      }
      
      Alert.alert(
        'Product Created',
        'Your product has been added successfully',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack()
          }
        ]
      );
      
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryButtons = () => {
    return (
      <View style={styles.categoryContainer}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              productData.category === category.id && styles.selectedCategory
            ]}
            onPress={() => handleInputChange('category', category.id)}
          >
            <Text 
              style={[
                styles.categoryButtonText,
                productData.category === category.id && styles.selectedCategoryText
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderUnitButtons = () => {
    return (
      <View style={styles.unitContainer}>
        {units.map(unit => (
          <TouchableOpacity
            key={unit.id}
            style={[
              styles.unitButton,
              productData.unit === unit.id && styles.selectedUnit
            ]}
            onPress={() => handleInputChange('unit', unit.id)}
          >
            <Text 
              style={[
                styles.unitButtonText,
                productData.unit === unit.id && styles.selectedUnitText
              ]}
            >
              {unit.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Add New Product</Text>
          
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={selectImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>Tap to add product image</Text>
                  <Text style={styles.imagePlaceholderIcon}>📷</Text>
                </View>
              )}
            </TouchableOpacity>
            {imageUri && (
              <TouchableOpacity style={styles.changeImageButton} onPress={selectImage}>
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter product name"
              value={productData.name}
              onChangeText={(text) => handleInputChange('name', text)}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="Enter product description"
              value={productData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              multiline={true}
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter price"
                value={productData.price}
                onChangeText={(text) => handleInputChange('price', text)}
                keyboardType="numeric"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Stock Quantity *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter stock"
                value={productData.stock}
                onChangeText={(text) => handleInputChange('stock', text)}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category *</Text>
            {renderCategoryButtons()}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Unit</Text>
            {renderUnitButtons()}
          </View>
          
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateProduct}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Product</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imagePickerButton: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12
  },
  imagePlaceholderIcon: {
    fontSize: 40,
    color: '#999'
  },
  changeImageButton: {
    marginTop: 8,
  },
  changeImageText: {
    color: '#4e9af1',
    fontWeight: '500',
    fontSize: 16
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategory: {
    backgroundColor: '#e6f2ff',
    borderColor: '#4e9af1',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#4e9af1',
    fontWeight: '600',
  },
  unitContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  unitButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedUnit: {
    backgroundColor: '#e6f2ff',
    borderColor: '#4e9af1',
  },
  unitButtonText: {
    color: '#666',
    fontSize: 14,
  },
  selectedUnitText: {
    color: '#4e9af1',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#4e9af1',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProductCreateScreen; 