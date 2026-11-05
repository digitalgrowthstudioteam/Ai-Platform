import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class CustomerUser {
  final String id;
  final String vendorId;
  final String name;
  final String phone;
  final String? email;
  final int totalOrders;
  final double totalSpent;

  CustomerUser({
    required this.id,
    required this.vendorId,
    required this.name,
    required this.phone,
    this.email,
    this.totalOrders = 0,
    this.totalSpent = 0.0,
  });

  factory CustomerUser.fromJson(Map<String, dynamic> json) {
    return CustomerUser(
      id: json['id']?.toString() ?? '',
      vendorId: json['vendor_id']?.toString() ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'],
      totalOrders: json['total_orders'] ?? 0,
      totalSpent: (json['total_spent'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'vendor_id': vendorId,
    'name': name,
    'phone': phone,
    'email': email,
    'total_orders': totalOrders,
    'total_spent': totalSpent,
  };
}

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  CustomerUser? _customer;
  String? _token;
  bool _isLoggedIn = false;
  bool _loading = false;
  String? _errorMessage;

  CustomerUser? get customer => _customer;
  String? get token => _token;
  bool get isLoggedIn => _isLoggedIn;
  bool get loading => _loading;
  String? get errorMessage => _errorMessage;

  String get displayName => _customer?.name.isNotEmpty == true ? _customer!.name : "Customer";
  String get customerPhone => _customer?.phone ?? "";
  String get customerEmail => _customer?.email ?? "";

  AuthProvider() {
    loadSession();
  }

  Future<void> loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sessJson = prefs.getString("dgs_customer_session_glam_stree_nails");
      if (sessJson != null) {
        final Map<String, dynamic> data = json.decode(sessJson);
        _token = data['token'];
        if (data['customer'] != null) {
          _customer = CustomerUser.fromJson(data['customer']);
          _isLoggedIn = true;
          notifyListeners();
          return;
        }
      }
    } catch (_) {}
    _isLoggedIn = false;
    _customer = null;
    notifyListeners();
  }

  Future<bool> login({required String phone, required String password}) async {
    _loading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.customerAuth(
        action: "login",
        phone: phone,
        password: password,
      );

      if (res['success'] == true && res['customer'] != null) {
        _customer = CustomerUser.fromJson(res['customer']);
        _token = res['token'];
        _isLoggedIn = true;
        await _saveSessionToDisk();
        _loading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = res['message'] ?? "Login failed";
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll("Exception: ", "");
    }

    _loading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register({
    required String name,
    required String phone,
    required String email,
    required String password,
  }) async {
    _loading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.customerAuth(
        action: "register",
        name: name,
        phone: phone,
        email: email,
        password: password,
      );

      if (res['success'] == true && res['customer'] != null) {
        _customer = CustomerUser.fromJson(res['customer']);
        _token = res['token'];
        _isLoggedIn = true;
        await _saveSessionToDisk();
        _loading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = res['message'] ?? "Registration failed";
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll("Exception: ", "");
    }

    _loading = false;
    notifyListeners();
    return false;
  }

  Future<bool> googleAuth({
    required String email,
    required String name,
    String? phone,
    String? googleId,
  }) async {
    _loading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.customerGoogleAuth(
        email: email,
        name: name,
        phone: phone,
        googleId: googleId,
      );

      if (res['success'] == true && res['customer'] != null) {
        _customer = CustomerUser.fromJson(res['customer']);
        _token = res['token'];
        _isLoggedIn = true;
        await _saveSessionToDisk();
        _loading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = res['message'] ?? "Google login failed";
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll("Exception: ", "");
    }

    _loading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    _customer = null;
    _token = null;
    _isLoggedIn = false;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove("dgs_customer_session_glam_stree_nails");
    } catch (_) {}
    notifyListeners();
  }

  Future<void> _saveSessionToDisk() async {
    if (_customer == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final map = {
        'token': _token,
        'customer': _customer!.toJson(),
        'isLoggedIn': true,
      };
      await prefs.setString("dgs_customer_session_glam_stree_nails", json.encode(map));
    } catch (_) {}
  }
}

