import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/store_models.dart';

class WishlistProvider with ChangeNotifier {
  static const String _storageKey = 'ashtekar_wishlist_items_v1';
  final List<ProductItem> _items = [];

  WishlistProvider() {
    _loadFromStorage();
  }

  List<ProductItem> get items => List.unmodifiable(_items);
  int get itemCount => _items.length;
  bool get isEmpty => _items.isEmpty;

  bool isWishlisted(String productId) {
    return _items.any((p) => p.id == productId);
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty) {
        final List<dynamic> list = json.decode(raw);
        _items.clear();
        for (final item in list) {
          try {
            _items.add(ProductItem.fromJson(item as Map<String, dynamic>));
          } catch (_) {}
        }
      }
    } catch (e) {
      debugPrint("Error loading wishlist from storage: $e");
    } finally {
      notifyListeners();
    }
  }

  Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = json.encode(_items.map((p) => p.toJson()).toList());
      await prefs.setString(_storageKey, raw);
    } catch (e) {
      debugPrint("Error saving wishlist to storage: $e");
    }
  }

  Future<bool> toggleWishlist(ProductItem product) async {
    final idx = _items.indexWhere((p) => p.id == product.id);
    final bool added;
    if (idx >= 0) {
      _items.removeAt(idx);
      added = false;
    } else {
      _items.add(product);
      added = true;
    }
    notifyListeners();
    await _saveToStorage();
    return added;
  }

  Future<void> addToWishlist(ProductItem product) async {
    if (!isWishlisted(product.id)) {
      _items.add(product);
      notifyListeners();
      await _saveToStorage();
    }
  }

  Future<void> removeFromWishlist(String productId) async {
    final before = _items.length;
    _items.removeWhere((p) => p.id == productId);
    if (_items.length != before) {
      notifyListeners();
      await _saveToStorage();
    }
  }

  Future<void> clearWishlist() async {
    _items.clear();
    notifyListeners();
    await _saveToStorage();
  }
}
