import 'package:flutter/material.dart';
import '../models/store_models.dart';

class CartProvider extends ChangeNotifier {
  final Map<String, CartItem> _items = {};

  Map<String, CartItem> get items => _items;

  int get itemCount {
    int total = 0;
    _items.forEach((key, item) {
      total += item.quantity;
    });
    return total;
  }

  int getQuantity(String productId, {String? variantId}) {
    final key = variantId != null ? "${productId}_${variantId}" : productId;
    return _items[key]?.quantity ?? 0;
  }

  double get subtotal {
    double total = 0.0;
    _items.forEach((key, item) {
      total += item.totalPrice;
    });
    return total;
  }

  double calculateShipping(StoreConfig? config) {
    if (config == null || !config.shippingEnabled) return 0.0;
    if (subtotal >= config.freeShippingMinOrder && config.freeShippingMinOrder > 0) {
      return 0.0;
    }
    return config.shippingCharge;
  }

  double calculateTotal(StoreConfig? config, {bool isCod = false}) {
    double total = subtotal + calculateShipping(config);
    if (isCod && config != null && config.codCharge > 0) {
      total += config.codCharge;
    }
    return total;
  }

  void addToCart(ProductItem product, {ProductVariant? variant, int quantity = 1}) {
    final key = variant != null ? "${product.id}_${variant.id}" : product.id;

    if (_items.containsKey(key)) {
      _items[key]!.quantity += quantity;
    } else {
      _items[key] = CartItem(
        product: product,
        variant: variant,
        quantity: quantity,
      );
    }
    notifyListeners();
  }

  void updateQuantity(String key, int newQuantity) {
    if (!_items.containsKey(key)) return;

    if (newQuantity <= 0) {
      _items.remove(key);
    } else {
      _items[key]!.quantity = newQuantity;
    }
    notifyListeners();
  }

  void removeItem(String key) {
    _items.remove(key);
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    notifyListeners();
  }
}
