import 'package:flutter/material.dart';
import '../models/vendor_models.dart';
import '../services/api_service.dart';

class CatalogProvider extends ChangeNotifier {
  List<VendorProductModel> _products = [];
  bool _isLoading = false;
  String _searchQuery = '';
  String? _errorMessage;

  List<VendorProductModel> get products {
    if (_searchQuery.isEmpty) return _products;
    final q = _searchQuery.toLowerCase();
    return _products.where((p) => p.name.toLowerCase().contains(q) || p.sku.toLowerCase().contains(q)).toList();
  }

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  Future<void> fetchProducts() async {
    _isLoading = true;
    notifyListeners();

    try {
      final rawList = await ApiService.getProducts();
      _products = rawList.map((e) => VendorProductModel.fromJson(e)).toList();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> toggleProductStock(String productId, bool newInStock) async {
    final success = await ApiService.toggleProductStock(productId, newInStock);
    if (success) {
      final index = _products.indexWhere((p) => p.id == productId);
      if (index != -1) {
        final old = _products[index];
        _products[index] = VendorProductModel(
          id: old.id,
          name: old.name,
          slug: old.slug,
          regularPrice: old.regularPrice,
          salePrice: old.salePrice,
          sku: old.sku,
          stockQuantity: newInStock ? 100 : 0,
          status: newInStock ? 'active' : 'out_of_stock',
          thumbnailUrl: old.thumbnailUrl,
        );
        notifyListeners();
      }
    }
    return success;
  }
}

