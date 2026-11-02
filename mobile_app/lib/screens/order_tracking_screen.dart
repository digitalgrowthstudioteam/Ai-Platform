import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../providers/store_provider.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String? initialOrderId;

  const OrderTrackingScreen({super.key, this.initialOrderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  final _searchCtrl = TextEditingController();
  Map<String, dynamic>? _orderData;
  List<dynamic> _customerOrders = [];
  bool _loading = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    if (widget.initialOrderId != null) {
      _searchCtrl.text = widget.initialOrderId!;
      _trackOrder(widget.initialOrderId!);
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _trackOrder(String query) async {
    final q = query.trim();
    if (q.isEmpty) return;

    setState(() {
      _loading = true;
      _errorMsg = null;
      _orderData = null;
      _customerOrders = [];
    });

    try {
      if (q.startsWith("ORD-") || q.contains("-")) {
        // Query by Order Number / ID
        final data = await ApiService().trackOrder(q);
        if (data != null) {
          setState(() => _orderData = data);
        } else {
          setState(() => _errorMsg = "No order found matching ID: $q");
        }
      } else {
        // Query by Customer Phone
        final list = await ApiService().getCustomerOrders(q);
        if (list.isNotEmpty) {
          setState(() => _customerOrders = list);
        } else {
          setState(() => _errorMsg = "No orders found for mobile: $q");
        }
      }
    } catch (e: any) {
      setState(() => _errorMsg = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final primary = store.primaryColor;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Track Order & Status",
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: const BackButton(color: Color(0xFF0F172A)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Search Input
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Track by Order ID or Mobile Number",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchCtrl,
                          decoration: const InputDecoration(
                            hintText: "e.g. ORD-1001 or 9876543210",
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => _trackOrder(_searchCtrl.text),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text("Track"),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            if (_loading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              )
            else if (_errorMsg != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Text(_errorMsg!, style: const TextStyle(color: Color(0xFFDC2626))),
              )
            else if (_orderData != null)
              _buildSingleOrderCard(_orderData!, primary)
            else if (_customerOrders.isNotEmpty)
              Column(
                children: _customerOrders.map((ord) => _buildSingleOrderCard(ord, primary)).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSingleOrderCard(Map<String, dynamic> ord, Color primary) {
    final status = (ord['fulfillment_status'] ?? ord['status'] ?? 'CONFIRMED').toString().toUpperCase();
    final trackingUrl = ord['tracking_url'] ?? ord['shipping_tracking_url'];
    final trackingId = ord['tracking_number'] ?? ord['tracking_id'];
    final courierName = ord['courier_name'] ?? 'Standard Delivery';
    final total = ord['total_amount'] ?? ord['total'] ?? 0;
    final orderNum = ord['order_number'] ?? ord['id'] ?? 'ORD';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                orderNum,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status,
                  style: TextStyle(color: primary, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ),
            ],
          ),
          const Divider(height: 20),

          // Total & Date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Total Amount: ₹$total", style: const TextStyle(fontWeight: FontWeight.bold)),
              Text("Payment: ${ord['payment_method'] ?? 'COD'}", style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
            ],
          ),

          if (trackingId != null && trackingId.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.local_shipping_outlined, size: 20, color: Color(0xFF2563EB)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "$courierName: $trackingId",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (trackingUrl != null && trackingUrl.toString().startsWith("http"))
                    TextButton(
                      onPressed: () async {
                        final uri = Uri.parse(trackingUrl.toString());
                        if (await canLaunchUrl(uri)) await launchUrl(uri);
                      },
                      child: const Text("View Tracking →", style: TextStyle(fontSize: 12)),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
