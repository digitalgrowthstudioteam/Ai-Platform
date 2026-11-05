import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/orders_provider.dart';
import '../providers/notifications_provider.dart';
import '../services/audio_alert_service.dart';
import '../widgets/incoming_order_ringing_dialog.dart';
import 'orders_tab.dart';
import 'products_tab.dart';
import 'hyperlocal_tab.dart';
import 'notifications_tab.dart';
import 'profile_tab.dart';
import 'order_detail_screen.dart';

class MainDashboardScreen extends StatefulWidget {
  const MainDashboardScreen({super.key});

  @override
  State<MainDashboardScreen> createState() => _MainDashboardScreenState();
}

class _MainDashboardScreenState extends State<MainDashboardScreen> {
  int _currentIndex = 0;
  StreamSubscription? _alertSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final orders = Provider.of<OrdersProvider>(context, listen: false);
      final notifs = Provider.of<NotificationsProvider>(context, listen: false);

      // Start live order polling
      orders.startPolling(isHyperlocalActive: auth.isHyperlocalActive);
      notifs.fetchNotifications();

      // Listen for Condition 2 ringing alarms
      _alertSub = AudioAlertService().alertStream.listen((event) {
        if (!mounted) return;
        if (event['type'] == 'RINGING') {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (_) => IncomingOrderRingingDialog(
              orderNumber: event['order_number'] ?? '',
              amount: (event['amount'] as num?)?.toDouble() ?? 0.0,
              customerName: event['customer'] ?? 'Customer',
              onAccept: () {
                setState(() => _currentIndex = 0);
                orders.fetchOrders(isHyperlocalActive: auth.isHyperlocalActive);
              },
            ),
          );
        }
      });
    });
  }

  @override
  void dispose() {
    _alertSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isHyperlocal = auth.isHyperlocalActive;

    // Condition 1: Dynamically configure tabs and bottom navigation items
    final List<Widget> screens = [
      const OrdersTab(),
      const ProductsTab(),
      if (isHyperlocal) const HyperlocalTab(),
      const NotificationsTab(),
      const ProfileTab(),
    ];

    final List<BottomNavigationBarItem> navItems = [
      const BottomNavigationBarItem(
        icon: Icon(Icons.inbox_outlined),
        activeIcon: Icon(Icons.inbox_rounded),
        label: 'Orders',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.inventory_2_outlined),
        activeIcon: Icon(Icons.inventory_2_rounded),
        label: 'Catalog',
      ),
      if (isHyperlocal)
        const BottomNavigationBarItem(
          icon: Icon(Icons.near_me_outlined),
          activeIcon: Icon(Icons.near_me_rounded),
          label: 'Local Delivery',
        ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.notifications_none_rounded),
        activeIcon: Icon(Icons.notifications_rounded),
        label: 'Alerts',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.storefront_outlined),
        activeIcon: Icon(Icons.storefront_rounded),
        label: 'Store',
      ),
    ];

    // Ensure index doesn't exceed screen count when entitlements change
    final safeIndex = _currentIndex < screens.length ? _currentIndex : 0;

    return Scaffold(
      body: IndexedStack(
        index: safeIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        ),
        child: BottomNavigationBar(
          currentIndex: safeIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          items: navItems,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: isHyperlocal && safeIndex == 2 ? const Color(0xFFF43F5E) : const Color(0xFF4F46E5),
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
          elevation: 0,
        ),
      ),
    );
  }
}

