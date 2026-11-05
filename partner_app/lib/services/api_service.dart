import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static const String tokenKey = 'dgs_partner_token';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(tokenKey);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(tokenKey, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(tokenKey);
  }

  static Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // 1. Login with Email & Password
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse(ApiConfig.loginUrl),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (data['access_token'] != null) {
        await saveToken(data['access_token']);
      }
      return data;
    } else {
      throw Exception(data['detail'] ?? 'Invalid credentials. Please try again.');
    }
  }

  // 2. Google Login
  static Future<Map<String, dynamic>> googleLogin(String idToken) async {
    final response = await http.post(
      Uri.parse(ApiConfig.googleLoginUrl),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: jsonEncode({'id_token': idToken}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (data['access_token'] != null) {
        await saveToken(data['access_token']);
      }
      return data;
    } else {
      throw Exception(data['detail'] ?? 'Google authentication failed.');
    }
  }

  // 3. Fetch User Profile & Active Module Entitlements
  static Future<Map<String, dynamic>> getMe() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConfig.meUrl), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch user profile (${response.statusCode})');
    }
  }

  // 4. Fetch Overview / Metrics
  static Future<Map<String, dynamic>> getOverview() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConfig.overviewUrl), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      return {};
    }
  }

  // 5. Fetch Orders
  static Future<List<dynamic>> getOrders() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConfig.ordersUrl), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception('Failed to load orders.');
    }
  }

  // 6. Update Order Status
  static Future<bool> updateOrderStatus(String orderId, String newStatus) async {
    final headers = await _getHeaders();
    final response = await http.patch(
      Uri.parse(ApiConfig.orderStatusUrl(orderId)),
      headers: headers,
      body: jsonEncode({'order_status': newStatus}),
    );
    return response.statusCode == 200;
  }

  // 7. Fetch Products
  static Future<List<dynamic>> getProducts() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConfig.productsUrl), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      return [];
    }
  }

  // 8. Toggle Product Stock Status
  static Future<bool> toggleProductStock(String productId, bool inStock) async {
    final headers = await _getHeaders();
    final response = await http.put(
      Uri.parse(ApiConfig.productStockUrl(productId)),
      headers: headers,
      body: jsonEncode({
        'status': inStock ? 'active' : 'out_of_stock',
        'stock_quantity': inStock ? 100 : 0,
      }),
    );
    return response.statusCode == 200;
  }

  // 9. Fetch Hyperlocal Settings
  static Future<Map<String, dynamic>> getHyperlocalSettings() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConfig.hyperlocalSettingsUrl), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      return {};
    }
  }

  // 10. Update Hyperlocal Settings
  static Future<bool> updateHyperlocalSettings(Map<String, dynamic> payload) async {
    final headers = await _getHeaders();
    final response = await http.put(
      Uri.parse(ApiConfig.hyperlocalSettingsUrl),
      headers: headers,
      body: jsonEncode(payload),
    );
    return response.statusCode == 200;
  }

  // 11. Fetch Notifications
  static Future<List<dynamic>> getNotifications() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConfig.notificationsUrl), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      return [];
    }
  }

  // 12. Mark Notification as Read
  static Future<void> markNotificationRead(String id) async {
    final headers = await _getHeaders();
    await http.patch(Uri.parse(ApiConfig.readNotificationUrl(id)), headers: headers);
  }
}

