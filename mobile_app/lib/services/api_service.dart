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
    } catch (_) {}
    return null;
  }

  /// 2. Banners - Synced dynamically with vendor dashboard
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

  /// 3. Categories - Synced dynamically with vendor dashboard
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

  /// 4. Products with search & category filter - Synced with vendor catalog
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
        final dynamic decoded = json.decode(response.body);
        final List<dynamic> items = (decoded is List) ? decoded : (decoded['items'] ?? []);
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

  /// 6. Customer Authentication (Sign In & Registration)
  Future<Map<String, dynamic>> customerAuth({
    required String action, // "login", "register", "otp_request", "otp_verify"
    required String phone,
    String? name,
    String? email,
    String? password,
  }) async {
    final payload = <String, dynamic>{
      "action": action,
      "phone": phone.trim(),
    };
    if (name != null && name.isNotEmpty) payload["name"] = name.trim();
    if (email != null && email.isNotEmpty) payload["email"] = email.trim();
    if (password != null && password.isNotEmpty) payload["password"] = password.trim();

    final response = await http.post(
      Uri.parse("$_baseUrl/customer/auth"),
      headers: {"Content-Type": "application/json"},
      body: json.encode(payload),
    );

    final data = json.decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      final detail = data['detail'];
      final msg = detail is String ? detail : (data['message'] ?? "Authentication failed");
      throw Exception(msg);
    }
  }

  /// 7. Google 1-Click Customer Authentication
  Future<Map<String, dynamic>> customerGoogleAuth({
    required String email,
    required String name,
    String? phone,
    String? googleId,
  }) async {
    final payload = <String, dynamic>{
      "email": email.trim(),
      "name": name.trim(),
    };
    if (phone != null && phone.isNotEmpty) payload["phone"] = phone.trim();
    if (googleId != null && googleId.isNotEmpty) payload["google_id"] = googleId.trim();

    final response = await http.post(
      Uri.parse("$_baseUrl/customer/google-auth"),
      headers: {"Content-Type": "application/json"},
      body: json.encode(payload),
    );

    final data = json.decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      final detail = data['detail'];
      final msg = detail is String ? detail : (data['message'] ?? "Google login failed");
      throw Exception(msg);
    }
  }

  /// 8. Forgot Password Request
  Future<Map<String, dynamic>> customerForgotPassword(String identifier) async {
    final response = await http.post(
      Uri.parse("$_baseUrl/customer/forgot-password"),
      headers: {"Content-Type": "application/json"},
      body: json.encode({"identifier": identifier.trim()}),
    );
    final data = json.decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      throw Exception(data['detail'] ?? "Password reset request failed");
    }
  }

  /// 9. Reset Password with OTP
  Future<Map<String, dynamic>> customerResetPassword({
    required String identifier,
    required String otp,
    required String newPassword,
  }) async {
    final response = await http.post(
      Uri.parse("$_baseUrl/customer/reset-password"),
      headers: {"Content-Type": "application/json"},
      body: json.encode({
        "identifier": identifier.trim(),
        "otp": otp.trim(),
        "new_password": newPassword.trim(),
      }),
    );
    final data = json.decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      throw Exception(data['detail'] ?? "Password reset failed");
    }
  }

  /// 10. Create Customer Order
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

  /// 11. Confirm Order Online Payment (Razorpay)
  Future<Map<String, dynamic>> confirmOrderPayment({
    required String orderId,
    required String razorpayPaymentId,
    String? razorpayOrderId,
    String? razorpaySignature,
  }) async {
    final response = await http.post(
      Uri.parse("$_baseUrl/orders/$orderId/confirm-payment"),
      headers: {"Content-Type": "application/json"},
      body: json.encode({
        "razorpay_payment_id": razorpayPaymentId,
        "razorpay_order_id": razorpayOrderId,
        "razorpay_signature": razorpaySignature,
      }),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['detail'] ?? "Payment confirmation failed");
    }
  }

  /// 12. Track Order by ID or Number
  Future<Map<String, dynamic>?> trackOrder(String orderId) async {
    try {
      final response = await http.get(Uri.parse("$_baseUrl/orders/$orderId"));
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
    } catch (_) {}
    return null;
  }

  /// 13. Order History by Customer Phone
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

  /// 14. Hyperlocal Delivery Eligibility Check
  Future<HyperlocalEligibility?> checkHyperlocalEligibility({
    double? latitude,
    double? longitude,
    String? pincode,
    double cartTotal = 0.0,
  }) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/hyperlocal/check-eligibility"),
        headers: {"Content-Type": "application/json"},
        body: json.encode({
          "latitude": latitude,
          "longitude": longitude,
          "pincode": pincode,
          "cart_total": cartTotal,
        }),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return HyperlocalEligibility.fromJson(data);
      }
    } catch (_) {}
    return null;
  }
}
