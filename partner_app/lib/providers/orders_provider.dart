import 'dart:async';
import 'package:flutter/material.dart';
import '../models/vendor_models.dart';
import '../services/api_service.dart';
import '../services/audio_alert_service.dart';

class OrdersProvider extends ChangeNotifier {
  List<VendorOrderModel> _orders = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _activeFilter = 'ALL';
  Timer? _pollingTimer;

  final Set<String> _knownOrderIds = {};
  bool _initialLoadDone = false;

  List<VendorOrderModel> get orders {
    if (_activeFilter == 'ALL') return _orders;
    return _orders.where((o) => o.orderStatus.toUpperCase() == _activeFilter).toList();
  }

  List<VendorOrderModel> get allOrders => _orders;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get activeFilter => _activeFilter;

  int get newOrdersCount => _orders.where((o) => o.orderStatus.toUpperCase() == 'NEW').length;
  int get processingOrdersCount => _orders.where((o) => o.orderStatus.toUpperCase() == 'PROCESSING').length;

  void setFilter(String filter) {
    _activeFilter = filter;
    notifyListeners();
  }

  void startPolling({required bool isHyperlocalActive}) {
    _pollingTimer?.cancel();
    fetchOrders(isHyperlocalActive: isHyperlocalActive, isSilent: false);
    _pollingTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      fetchOrders(isHyperlocalActive: isHyperlocalActive, isSilent: true);
    });
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> fetchOrders({required bool isHyperlocalActive, bool isSilent = false}) async {
    if (!isSilent) {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final rawList = await ApiService.getOrders();
      final freshOrders = rawList.map((e) => VendorOrderModel.fromJson(e)).toList();

      // Check for newly placed orders
      if (_initialLoadDone) {
        for (var o in freshOrders) {
          if (!_knownOrderIds.contains(o.id) && o.orderStatus.toUpperCase() == 'NEW') {
            // Trigger audio alert (Strictly follows Condition 2: only for active hyperlocal)
            AudioAlertService().triggerNewOrderAlert(
              isHyperlocalActive: isHyperlocalActive,
              orderNumber: o.orderNumber,
              orderAmount: o.totalAmount,
              customerName: o.customerName,
            );
            break;
          }
        }
      }

      _orders = freshOrders;
      _knownOrderIds.clear();
      for (var o in _orders) {
        _knownOrderIds.add(o.id);
      }
      _initialLoadDone = true;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      if (!isSilent) {
        _isLoading = false;
      }
      notifyListeners();
    }
  }

  Future<bool> updateStatus(String orderId, String newStatus) async {
    final success = await ApiService.updateOrderStatus(orderId, newStatus);
    if (success) {
      final index = _orders.indexWhere((o) => o.id == orderId);
      if (index != -1) {
        final old = _orders[index];
        _orders[index] = VendorOrderModel(
          id: old.id,
          orderNumber: old.orderNumber,
          customerName: old.customerName,
          customerPhone: old.customerPhone,
          customerEmail: old.customerEmail,
          shippingAddress: old.shippingAddress,
          totalAmount: old.totalAmount,
          paymentMethod: old.paymentMethod,
          paymentStatus: old.paymentStatus,
          orderStatus: newStatus,
          courierName: old.courierName,
          trackingNumber: old.trackingNumber,
          createdAt: old.createdAt,
          items: old.items,
          isHyperlocalDelivery: old.isHyperlocalDelivery,
        );
        notifyListeners();
      }
    }
    return success;
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}

