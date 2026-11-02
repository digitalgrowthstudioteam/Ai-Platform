import 'package:flutter/material.dart';
import '../models/store_models.dart';
import '../services/api_service.dart';
import '../config/app_config.dart';

class StoreProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  StoreConfig? _config;
  List<BannerItem> _banners = [];
  List<CategoryItem> _categories = [];
  List<ProductItem> _products = [];
  bool _loading = true;
  String? _selectedCategory;
  String _searchQuery = "";

  StoreConfig? get config => _config;
  List<BannerItem> get banners => _banners;
  List<CategoryItem> get categories => _categories;
  List<ProductItem> get products => _products;
  bool get loading => _loading;
  String? get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;

  Color get primaryColor {
    if (_config != null && _config!.primaryColorHex.isNotEmpty) {
      try {
        final hex = _config!.primaryColorHex.replaceAll("#", "");
        return Color(int.parse("FF$hex", radix: 16));
      } catch (_) {}
    }
    return AppConfig.primaryColor;
  }

  Color get secondaryColor {
    if (_config != null && _config!.secondaryColorHex.isNotEmpty) {
      try {
        final hex = _config!.secondaryColorHex.replaceAll("#", "");
        return Color(int.parse("FF$hex", radix: 16));
      } catch (_) {}
    }
    return AppConfig.secondaryColor;
  }

  Future<void> initializeStore() async {
    _loading = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        _api.getStoreConfig(),
        _api.getBanners(),
        _api.getCategories(),
        _api.getProducts(),
      ]);

      _config = results[0] as StoreConfig?;
      _banners = results[1] as List<BannerItem>;
      _categories = results[2] as List<CategoryItem>;
      _products = results[3] as List<ProductItem>;

      if (_config != null) {
        AppConfig.appTitle = _config!.storeName;
      }
    } catch (_) {
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void selectCategory(String? categorySlug) {
    _selectedCategory = categorySlug;
    fetchProducts();
  }

  void searchProducts(String query) {
    _searchQuery = query;
    fetchProducts();
  }

  Future<void> fetchProducts() async {
    _loading = true;
    notifyListeners();
    try {
      _products = await _api.getProducts(
        category: _selectedCategory,
        search: _searchQuery.isEmpty ? null : _searchQuery,
      );
    } catch (_) {
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
