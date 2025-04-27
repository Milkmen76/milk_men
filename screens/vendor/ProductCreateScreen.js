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
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const ProductCreateScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
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

  const selectImage = async () => {
    try {
      setImageLoading(true);
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!status || status !== 'granted') {
        Alert.alert('Permission Required', 'You need to grant permission to access your photos');
        setImageLoading(false);
        return;
      }
      
      // Fix ImagePicker configuration - remove any problematic parameters
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        
        try {
          // Read the image file to get base64 data
          const base64 = await FileSystem.readAsStringAsync(selectedAsset.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          setLocalImage({
            uri: selectedAsset.uri,
            type: 'image/jpeg',
            name: 'product_image.jpg',
            base64: base64
          });
          
          console.log('Successfully set image data');
        } catch (readError) {
          console.error('Error reading base64 from URI:', readError);
          Alert.alert('Warning', 'Could not read image data properly. Please try again.');
        }
      } else {
        console.log('Image selection canceled or no image selected');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image: ' + error.message);
    } finally {
      setImageLoading(false);
    }
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
    if (!imageUri && !localImage?.base64) {
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
      console.log('Creating product with image data...');
      
      let base64Data = localImage?.base64;
      
      // If we have an image URI but no base64 data, try to read it now
      if (imageUri && !base64Data) {
        try {
          console.log('Reading base64 data from URI before saving');
          base64Data = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          console.log('Successfully read base64 data, length:', base64Data.length);
        } catch (readError) {
          console.error('Error reading base64 from URI:', readError);
          Alert.alert('Warning', 'Could not read image data. Product will be saved without an image.');
        }
      }
      
      // Prepare product data
      const newProductData = {
        name: productData.name,
        description: productData.description || 'Fresh dairy product',
        price: Number(productData.price),
        category: productData.category,
        stock: Number(productData.stock),
        unit: productData.unit,
        vendor_id: user.id,
        image: `product_${Date.now()}.jpg`,
        image_base64: base64Data || '',
        created_at: new Date().toISOString(),
      };
      
      console.log('Sending product data to localData.addProduct, has image_base64:', !!newProductData.image_base64);
      
      const result = await localData.addProduct(newProductData);
      
      if (result) {
        console.log('Product created successfully with ID:', result.product_id);
        Alert.alert(
          'Success', 
          'Product created successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error('Failed to create product');
      }
    } catch (error) {
      console.error('Create product error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Add New Product</Text>
            
            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={selectImage} disabled={imageLoading}>
                {imageUri ? (
                  <Image 
                    source={{ uri: imageUri }}
                    style={styles.productImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    {imageLoading ? (
                      <ActivityIndicator size="large" color="#4e9af1" />
                    ) : (
                      <>
                        <Text style={styles.imagePlaceholderIcon}>📷</Text>
                        <Text style={styles.imagePlaceholderText}>
                          Tap to upload product image
                        </Text>
                      </>
                    )}
                  </View>
                )}
                
                {imageUri && imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
              
              {imageUri && !imageLoading && (
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
              <View style={[styles.inputGroup, { flex: 1, marginRight: SIZES.PADDING_S }]}>
                <Text style={styles.inputLabel}>Price (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter price"
                  value={productData.price}
                  onChangeText={(text) => handleInputChange('price', text)}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1 }]}>
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
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: SIZES.PADDING_M,
  },
  title: {
    fontSize: SIZES.HEADER,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_L,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: SIZES.PADDING_L,
  },
  imagePickerButton: {
    width: scale(180),
    height: scale(180),
    backgroundColor: '#f0f0f0',
    borderRadius: SIZES.RADIUS_M,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: SIZES.PADDING_S,
    ...getShadowStyles(2),
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.PADDING_M,
    width: '100%',
    height: '100%',
    backgroundColor: '#e3f2fd',
  },
  imagePlaceholderText: {
    fontSize: SIZES.BODY,
    color: '#4e9af1',
    textAlign: 'center',
    marginTop: SIZES.PADDING_S,
    fontWeight: '500',
  },
  imagePlaceholderIcon: {
    fontSize: scale(40),
    color: '#4e9af1'
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageButton: {
    marginTop: SIZES.PADDING_XS,
  },
  changeImageText: {
    color: '#4e9af1',
    fontWeight: '500',
    fontSize: SIZES.BODY
  },
  inputGroup: {
    marginBottom: SIZES.PADDING_M,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: SIZES.PADDING_M,
  },
  inputLabel: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_S,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    minHeight: SIZES.INPUT_HEIGHT,
  },
  textAreaInput: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.PADDING_S,
  },
  categoryButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: SIZES.RADIUS_L,
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    marginRight: SIZES.PADDING_S,
    marginBottom: SIZES.PADDING_S,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: SIZES.CHIP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#e6f2ff',
    borderColor: '#4e9af1',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: SIZES.CAPTION,
  },
  selectedCategoryText: {
    color: '#4e9af1',
    fontWeight: '600',
  },
  unitContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.PADDING_S,
  },
  unitButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: SIZES.RADIUS_L,
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    marginRight: SIZES.PADDING_S,
    marginBottom: SIZES.PADDING_S,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: SIZES.CHIP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedUnit: {
    backgroundColor: '#e6f2ff',
    borderColor: '#4e9af1',
  },
  unitButtonText: {
    color: '#666',
    fontSize: SIZES.CAPTION,
  },
  selectedUnitText: {
    color: '#4e9af1',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#4e9af1',
    borderRadius: SIZES.RADIUS_M,
    paddingVertical: SIZES.PADDING_M,
    alignItems: 'center',
    marginTop: SIZES.PADDING_L,
    minHeight: SIZES.BUTTON_HEIGHT,
    justifyContent: 'center',
    ...getShadowStyles(3),
  },
  createButtonText: {
    color: '#fff',
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
  },
});

export default ProductCreateScreen;
