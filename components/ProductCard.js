import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const ProductCard = ({ product }) => (
  <View style={styles.card}>
    <Image source={{ uri: product.image_url }} style={styles.image} />
    <Text style={styles.name}>{product.name}</Text>
    <Text style={styles.price}>₹{product.price}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  price: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProductCard;
