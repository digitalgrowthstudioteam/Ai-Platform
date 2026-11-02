import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/store_models.dart';

class ApiService {
  final String slug;

  ApiService({String? storeSlug}) : slug = storeSlug ?? AppConfig.activeStoreSlug;

  String get _baseUrl => "${AppConfig.baseApiUrl}/$slug";

  /// 1. Storefront branding, payment gateways, and shipping config
  Future<StoreConfig?> getStoreConfig() async {
    try {
      final response = await http.get(Uri.parse("$_baseUrl/config"));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return StoreConfig.fromJson(data);
      }
    } catch (e) {
      // Offline fallback
    }
    return null;
  }

  /// 2. Banners
  Future<List<BannerItem>> getBanners() async {
    try {
      final response = await http.get(Uri.parse("$_baseUrl/banners"));
      if (response.statusCode == 200) {
        final List<dynamic> list = json.decode(response.body);
        return list.map((item) => BannerItem.fromJson(item)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// 3. Categories
  Future<List<CategoryItem>> getCategories() async {
    try {
      final response = await http.get(Uri.parse("$_baseUrl/categories"));
      if (response.statusCode == 200) {
        final List<dynamic> list = json.decode(response.body);
        return list.map((item) => CategoryItem.fromJson(item)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// 4. Products with search & category filter
  Future<List<ProductItem>> getProducts({String? category, String? search}) async {
    try {
      final queryParams = <String, String>{};
      if (category != null && category.isNotEmpty) {
        queryParams['category'] = category;
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }

      final uri = Uri.parse("$_baseUrl/products").replace(queryParameters: queryParams);
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> items = data['items'] ?? [];
        return items.map((item) => ProductItem.fromJson(item)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// 5. Single Product Detail
  Future<ProductItem?> getProductDetail(String productId) async {
    try {
      final response = await http.get(Uri.parse("$_baseUrl/products/$productId"));
      if (response.statusCode == 200) {
        return ProductItem.fromJson(json.decode(response.body));
      }
    } catch (_) {}
    return null;
  }

  /// 6. Create Customer Order
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse("$_baseUrl/orders"),
      headers: {"Content-Type": "application/json"},
      body: json.encode(payload),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['detail'] ?? "Failed to place order");
    }
  }

  /// 7. Track Order by ID
  Future<Map<String, dynamic>?> trackOrder(String orderId) async {
    try {
      final response = await http.get(Uri.parse("$_baseUrl/orders/$orderId"));
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (_) {}
    return null;
  }

  /// 8. Order History by Customer Phone
  Future<List<dynamic>> getCustomerOrders(String phone) async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/customer-orders?phone=${Uri.encodeComponent(phone)}"),
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (_) {}
    return [];
  }
}
