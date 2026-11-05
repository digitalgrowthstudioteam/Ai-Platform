import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

  // Hyperlocal Location State
  String? _selectedPincode;
  String? _selectedAddress;
  double? _customerLatitude;
  double? _customerLongitude;
  HyperlocalEligibility? _hyperlocalEligibility;
  bool _isCheckingEligibility = false;

  StoreConfig? get config => _config;
  List<BannerItem> get banners => _banners;
  List<CategoryItem> get categories => _categories;
  List<ProductItem> get products => _products;
  bool get loading => _loading;
  String? get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;

  // Hyperlocal Getters
  String? get selectedPincode => _selectedPincode;
  String? get selectedAddress => _selectedAddress;
  double? get customerLatitude => _customerLatitude;
  double? get customerLongitude => _customerLongitude;
  HyperlocalEligibility? get hyperlocalEligibility => _hyperlocalEligibility;
  bool get isCheckingEligibility => _isCheckingEligibility;

  bool get isHyperlocalActive => _config?.hyperlocalEnabled ?? false;

  String get deliveryLocationDisplayText {
    if (_selectedAddress != null && _selectedAddress!.isNotEmpty) {
      return _selectedAddress!;
    }
    if (_selectedPincode != null && _selectedPincode!.isNotEmpty) {
      return "Pincode: $_selectedPincode";
    }
    return _config?.storeLocationName != null && _config!.storeLocationName!.isNotEmpty
        ? "Select Delivery Location"
        : "Enter Delivery Pincode";
  }

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
        await _loadSavedLocation();
      }
    } catch (_) {
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> _loadSavedLocation() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _selectedPincode = prefs.getString("user_pincode");
      _selectedAddress = prefs.getString("user_address");
      final lat = prefs.getDouble("user_latitude");
      final lon = prefs.getDouble("user_longitude");
      if (lat != null && lon != null) {
        _customerLatitude = lat;
        _customerLongitude = lon;
      }
      if (_selectedPincode != null || (_customerLatitude != null && _customerLongitude != null)) {
        await checkEligibility();
      }
    } catch (_) {}
  }

  Future<void> setLocation({
    String? pincode,
    String? address,
    double? latitude,
    double? longitude,
    double cartTotal = 0.0,
  }) async {
    if (pincode != null) _selectedPincode = pincode.trim();
    if (address != null) _selectedAddress = address.trim();
    if (latitude != null) _customerLatitude = latitude;
    if (longitude != null) _customerLongitude = longitude;

    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      if (_selectedPincode != null) await prefs.setString("user_pincode", _selectedPincode!);
      if (_selectedAddress != null) await prefs.setString("user_address", _selectedAddress!);
      if (_customerLatitude != null) await prefs.setDouble("user_latitude", _customerLatitude!);
      if (_customerLongitude != null) await prefs.setDouble("user_longitude", _customerLongitude!);
    } catch (_) {}

    await checkEligibility(cartTotal: cartTotal);
  }

  Future<void> checkEligibility({double cartTotal = 0.0}) async {
    if (_config == null || !_config!.hyperlocalEnabled) return;

    _isCheckingEligibility = true;
    notifyListeners();

    try {
      _hyperlocalEligibility = await _api.checkHyperlocalEligibility(
        latitude: _customerLatitude,
        longitude: _customerLongitude,
        pincode: _selectedPincode,
        cartTotal: cartTotal,
      );
    } catch (_) {
    } finally {
      _isCheckingEligibility = false;
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
