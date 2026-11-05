import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/smart_store_image.dart';
import '../config/app_config.dart';
import 'login_screen.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String? initialOrderId;

  const OrderTrackingScreen({super.key, this.initialOrderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  final _searchCtrl = TextEditingController();
  List<dynamic> _allOrders = [];
  List<dynamic> _filteredOrders = [];
  Map<String, dynamic>? _singleOrderResult;
  bool _loading = false;
  String? _errorMsg;
  String _activeFilter = "ALL"; // "ALL", "ACTIVE", "DELIVERED"
  String? _loadedPhone;

  @override
  void initState() {
    super.initState();
    if (widget.initialOrderId != null) {
      _searchCtrl.text = widget.initialOrderId!;
      _trackSingleOrder(widget.initialOrderId!);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.initialOrderId == null) {
      final auth = Provider.of<AuthProvider>(context);
      if (auth.isLoggedIn && auth.customerPhone.isNotEmpty && _loadedPhone != auth.customerPhone) {
        _loadedPhone = auth.customerPhone;
        _fetchOrdersForPhone(auth.customerPhone);
      }
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchOrdersForPhone(String phone) async {
    final clean = phone.trim();
    if (clean.isEmpty) return;

    setState(() {
      _loading = true;
      _errorMsg = null;
      _singleOrderResult = null;
    });

    try {
      final list = await ApiService().getCustomerOrders(clean);
      if (mounted) {
        setState(() {
          _allOrders = list;
          _applyFilter();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMsg = e.toString().replaceAll("Exception: ", ""));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _trackSingleOrder(String orderId) async {
    final clean = orderId.trim();
    if (clean.isEmpty) return;

    setState(() {
      _loading = true;
      _errorMsg = null;
      _singleOrderResult = null;
      _allOrders = [];
      _filteredOrders = [];
    });

    try {
      final data = await ApiService().trackOrder(clean);
      if (mounted) {
        if (data != null) {
          setState(() => _singleOrderResult = data);
        } else {
          setState(() => _errorMsg = "No order found matching ID: $clean");
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMsg = e.toString().replaceAll("Exception: ", ""));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _handleSearchSubmit(String query) {
    final q = query.trim();
    if (q.isEmpty) return;
    if (q.startsWith("ORD-") || q.contains("-")) {
      _trackSingleOrder(q);
    } else {
      _fetchOrdersForPhone(q);
    }
  }

  void _applyFilter() {
    final query = _searchCtrl.text.trim().toLowerCase();
    setState(() {
      _filteredOrders = _allOrders.where((ord) {
        final status = (ord['order_status'] ?? ord['status'] ?? 'NEW').toString().toUpperCase();
        if (_activeFilter == "ACTIVE") {
          if (status == "DELIVERED" || status == "CANCELLED") return false;
        } else if (_activeFilter == "DELIVERED") {
          if (status != "DELIVERED") return false;
        }

        // Text query filter if search isn't phone
        if (query.isNotEmpty && !RegExp(r'^[0-9]+$').hasMatch(query)) {
          final ordNum = (ord['order_number'] ?? '').toString().toLowerCase();
          final items = (ord['items'] as List<dynamic>?) ?? [];
          final itemNames = items.map((i) => (i['product_name'] ?? '').toString().toLowerCase()).join(' ');
          return ordNum.contains(query) || itemNames.contains(query);
        }

        return true;
      }).toList();
    });
  }

  String _formatOrderDate(dynamic dateVal) {
    if (dateVal == null) return "Recent";
    try {
      final dt = DateTime.parse(dateVal.toString());
      return DateFormat('EEEE, d MMMM yyyy').format(dt.toLocal());
    } catch (_) {
      return dateVal.toString().substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final primary = store.primaryColor;
    final secondary = store.secondaryColor;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Your Orders",
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: const BackButton(color: Color(0xFF0F172A)),
        actions: [
          if (auth.isLoggedIn)
            IconButton(
              icon: const Icon(Icons.refresh, color: Color(0xFF0F172A)),
              tooltip: "Refresh Orders",
              onPressed: () => _fetchOrdersForPhone(auth.customerPhone),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          if (auth.isLoggedIn && auth.customerPhone.isNotEmpty) {
            await _fetchOrdersForPhone(auth.customerPhone);
          } else if (_searchCtrl.text.isNotEmpty) {
            _handleSearchSubmit(_searchCtrl.text);
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Amazon-Style Search Bar
              _buildSearchBar(primary),

              const SizedBox(height: 12),

              // 2. Unauthenticated Banner (if not logged in)
              if (!auth.isLoggedIn) _buildNotLoggedInBanner(primary),

              // 3. Error Banner (if any)
              if (_errorMsg != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_errorMsg!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12)),
                      ),
                    ],
                  ),
                ),

              // 4. Loading Indicator
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator()),
                )

              // 5. Single Order Search Result (if tracked by ORD-ID)
              else if (_singleOrderResult != null) ...[
                _buildSectionHeader("Search Result", null),
                const SizedBox(height: 8),
                _buildAmazonOrderCard(_singleOrderResult!, primary, secondary),
              ]

              // 6. Logged In / Phone Orders List
              else if (_allOrders.isNotEmpty) ...[
                // Amazon Shortcuts: Buy Again Carousel
                _buildBuyAgainSection(primary),

                const SizedBox(height: 16),

                // Filter Chips (All, In Transit, Delivered)
                _buildFilterChips(primary),

                const SizedBox(height: 14),

                // Purchase History Section Header
                _buildSectionHeader(
                  "Purchase history",
                  auth.isLoggedIn ? "Showing orders for +91 ${auth.customerPhone}" : null,
                ),

                const SizedBox(height: 10),

                // Order Cards List
                if (_filteredOrders.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    alignment: Alignment.center,
                    child: Text(
                      "No orders found matching '$_activeFilter'",
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                    ),
                  )
                else
                  ..._filteredOrders.map((ord) => _buildAmazonOrderCard(ord, primary, secondary)),
              ]

              // 7. Empty State (Logged in but 0 orders)
              else if (auth.isLoggedIn && !_loading)
                _buildEmptyOrdersState(primary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar(Color primary) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchCtrl,
        onChanged: (val) => _applyFilter(),
        onSubmitted: _handleSearchSubmit,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: "Search all orders or enter mobile / ORD-ID",
          hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
          prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B), size: 20),
          suffixIcon: _searchCtrl.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18, color: Color(0xFF94A3B8)),
                  onPressed: () {
                    _searchCtrl.clear();
                    final auth = Provider.of<AuthProvider>(context, listen: false);
                    if (auth.isLoggedIn && auth.customerPhone.isNotEmpty) {
                      _fetchOrdersForPhone(auth.customerPhone);
                    } else {
                      setState(() {
                        _singleOrderResult = null;
                        _allOrders = [];
                        _filteredOrders = [];
                      });
                    }
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildNotLoggedInBanner(Color primary) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.inventory_2_outlined, color: Color(0xFF0F172A), size: 22),
              SizedBox(width: 8),
              Text(
                "Looking for your order history?",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            "Sign in to see past orders placed on your account, get live courier delivery updates, and easily reorder favorites.",
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const LoginScreen(
                    promptMessage: "Sign in to access your complete purchase history.",
                    redirectTo: OrderTrackingScreen(),
                  ),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text("Sign In to View Your Orders", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(Color primary) {
    final filters = [
      {"label": "All Orders", "id": "ALL"},
      {"label": "In Transit", "id": "ACTIVE"},
      {"label": "Delivered", "id": "DELIVERED"},
    ];

    return Row(
      children: filters.map((f) {
        final isSelected = _activeFilter == f["id"];
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ChoiceChip(
            label: Text(f["label"]!),
            selected: isSelected,
            selectedColor: primary,
            labelStyle: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : const Color(0xFF475569),
            ),
            backgroundColor: Colors.white,
            side: BorderSide(color: isSelected ? primary : const Color(0xFFE2E8F0)),
            onSelected: (_) {
              setState(() => _activeFilter = f["id"]!);
              _applyFilter();
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSectionHeader(String title, String? subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: 0.3,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
          ),
        ],
      ],
    );
  }

  Widget _buildBuyAgainSection(Color primary) {
    // Extract unique products from past orders
    final Map<String, dynamic> uniqueItems = {};
    for (final ord in _allOrders) {
      final items = (ord['items'] as List<dynamic>?) ?? [];
      for (final item in items) {
        final name = item['product_name'] ?? 'Apparel';
        if (!uniqueItems.containsKey(name)) {
          uniqueItems[name] = item;
        }
      }
    }

    if (uniqueItems.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Buy again",
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 130,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: uniqueItems.values.take(6).map((item) {
              final imgUrl = item['image_url'];
              final name = item['product_name'] ?? '';
              final price = item['price'] ?? 0;

              return Container(
                width: 110,
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Center(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SmartStoreImage(
                            imageUrl: imgUrl,
                            width: 80,
                            height: 65,
                            fit: BoxFit.cover,
                            fallbackText: "AC",
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "₹${(price as num).toStringAsFixed(0)}",
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                        ),
                        InkWell(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text("Item selected: $name"),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          child: const Icon(Icons.add_shopping_cart, size: 16, color: Color(0xFFD4AF37)),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildAmazonOrderCard(Map<String, dynamic> ord, Color primary, Color secondary) {
    final status = (ord['order_status'] ?? ord['status'] ?? 'NEW').toString().toUpperCase();
    final ordNum = ord['order_number'] ?? ord['id'] ?? 'ORD';
    final total = (ord['total_amount'] as num?)?.toDouble() ?? 0.0;
    final paymentMethod = ord['payment_method'] ?? 'COD';
    final dateStr = _formatOrderDate(ord['created_at']);
    final items = (ord['items'] as List<dynamic>?) ?? [];

    // Delivery Status Headline (like Amazon)
    String statusTitle;
    Color statusColor;
    IconData statusIcon;

    if (status == "DELIVERED") {
      statusTitle = "Delivered on $dateStr";
      statusColor = const Color(0xFF16A34A);
      statusIcon = Icons.check_circle;
    } else if (status == "SHIPPED") {
      statusTitle = "Dispatched • Arriving Soon";
      statusColor = const Color(0xFF2563EB);
      statusIcon = Icons.local_shipping;
    } else if (status == "CANCELLED") {
      statusTitle = "Order Cancelled";
      statusColor = const Color(0xFFDC2626);
      statusIcon = Icons.cancel;
    } else {
      statusTitle = "Order Confirmed • Preparing Package";
      statusColor = const Color(0xFFD97706);
      statusIcon = Icons.schedule;
    }

    return InkWell(
      onTap: () => _showOrderDetailsModal(ord, primary),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left: Amazon-Style Thumbnails
            _buildOrderThumbnails(items),

            const SizedBox(width: 14),

            // Right: Order Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Headline
                  Row(
                    children: [
                      Icon(statusIcon, color: statusColor, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          statusTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Ordered on date
                  Text(
                    "Ordered on $dateStr",
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 6),

                  // Order items snippet
                  if (items.isNotEmpty)
                    Text(
                      items[0]['product_name'] ?? 'Apparel Item',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F172A),
                      ),
                    ),

                  const SizedBox(height: 8),

                  // Price & ID footer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "₹${total.toStringAsFixed(0)} • $paymentMethod",
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          ordNum,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, color: Color(0xFF94A3B8), size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderThumbnails(List<dynamic> items) {
    if (items.isEmpty) {
      return Container(
        width: 74,
        height: 74,
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.shopping_bag_outlined, color: Color(0xFF94A3B8)),
      );
    }

    if (items.length == 1) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: SmartStoreImage(
            imageUrl: items[0]['image_url'],
            width: 76,
            height: 76,
            fit: BoxFit.cover,
            fallbackText: "AC",
          ),
        ),
      );
    }

    // Multiple items (Amazon stacked preview)
    final extraCount = items.length - 1;
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE2E8F0)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: SmartStoreImage(
              imageUrl: items[0]['image_url'],
              width: 76,
              height: 76,
              fit: BoxFit.cover,
              fallbackText: "AC",
            ),
          ),
        ),
        Positioned(
          bottom: 4,
          right: 4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A).withAlpha(220),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              "+$extraCount more",
              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }

  void _showOrderDetailsModal(Map<String, dynamic> ord, Color primary) {
    final status = (ord['order_status'] ?? ord['status'] ?? 'NEW').toString().toUpperCase();
    final ordNum = ord['order_number'] ?? ord['id'] ?? 'ORD';
    final courierName = ord['courier_name'] ?? 'Blue Dart Express';
    final trackingNumber = ord['tracking_number'];
    final trackingUrl = ord['tracking_url'];
    final items = (ord['items'] as List<dynamic>?) ?? [];
    final address = ord['shipping_address'] ?? 'Customer Delivery Address';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, scrollCtrl) => SingleChildScrollView(
          controller: scrollCtrl,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Modal Drag Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Order Title & ID
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ordNum,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        "Placed on ${_formatOrderDate(ord['created_at'])}",
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(color: primary, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                ],
              ),

              const Divider(height: 28),

              // Live Courier Stepper
              const Text("Delivery Progress", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 12),
              _buildTimelineStep("Order Placed", "Your order has been received by store", true, true),
              _buildTimelineStep("Confirmed & Packed", "Quality check & packaging completed", status != "NEW", status == "SHIPPED" || status == "DELIVERED"),
              _buildTimelineStep(
                trackingNumber != null ? "Shipped via $courierName" : "Dispatched with Courier",
                trackingNumber != null ? "AWB Tracking ID: $trackingNumber" : "In transit to delivery hub",
                status == "SHIPPED" || status == "DELIVERED",
                status == "DELIVERED",
              ),
              _buildTimelineStep("Delivered", "Delivered to your address", status == "DELIVERED", false),

              const Divider(height: 28),

              // Items in Order
              Text("Items in this order (${items.length})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 10),
              ...items.map((it) {
                final itName = it['product_name'] ?? 'Product';
                final itPrice = (it['price'] as num?)?.toDouble() ?? 0.0;
                final itQty = it['quantity'] ?? 1;
                final itImg = it['image_url'];

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SmartStoreImage(
                          imageUrl: itImg,
                          width: 44,
                          height: 44,
                          fit: BoxFit.cover,
                          fallbackText: "AC",
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(itName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
                            Text("Qty: $itQty • ₹${itPrice.toStringAsFixed(0)} each", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      Text("₹${(itPrice * itQty).toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                );
              }),

              const Divider(height: 24),

              // Delivery Address
              const Text("Delivery Address", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Text(address, style: const TextStyle(fontSize: 12.5, color: Color(0xFF334155), height: 1.4)),
              ),

              const SizedBox(height: 20),

              // Actions (Track URL or WhatsApp)
              if (trackingUrl != null && trackingUrl.toString().startsWith("http")) ...[
                ElevatedButton.icon(
                  onPressed: () async {
                    final uri = Uri.parse(trackingUrl.toString());
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  },
                  icon: const Icon(Icons.open_in_new, size: 18),
                  label: const Text("Track on Courier Website"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 10),
              ],

              OutlinedButton.icon(
                onPressed: () async {
                  final phone = AppConfig.supportPhone;
                  final url = "https://wa.me/91$phone?text=Hi%20Ashtekar%20Collection,%20I%20have%20a%20question%20regarding%20my%20order%20$ordNum";
                  final uri = Uri.parse(url);
                  if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
                },
                icon: const Icon(Icons.chat, color: Color(0xFF16A34A), size: 18),
                label: const Text("Chat with Us on WhatsApp", style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 44),
                  side: const BorderSide(color: Color(0xFF86EFAC)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimelineStep(String title, String subtitle, bool isDone, bool hasNext) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: isDone ? const Color(0xFF16A34A) : const Color(0xFFCBD5E1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isDone ? Icons.check : Icons.circle,
                size: isDone ? 14 : 8,
                color: Colors.white,
              ),
            ),
            if (hasNext)
              Container(
                width: 2,
                height: 32,
                color: isDone ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: isDone ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyOrdersState(Color primary) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      alignment: Alignment.center,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.shopping_bag_outlined, size: 48, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 16),
          const Text(
            "No Orders Placed Yet",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 6),
          const Text(
            "Looks like you haven't placed an order with Ashtekar Collection yet. Explore our latest Men's apparel collection!",
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B), height: 1.4),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text("Start Shopping", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
