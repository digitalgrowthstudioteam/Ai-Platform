import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../providers/store_provider.dart';
import '../services/api_service.dart';
import 'order_tracking_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _pincodeCtrl = TextEditingController();

  String _paymentMode = "COD"; // COD or RAZORPAY
  bool _submitting = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _pincodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _handlePlaceOrder() async {
    if (!_formKey.currentState!.validate()) return;

    final cart = Provider.of<CartProvider>(context, listen: false);
    final store = Provider.of<StoreProvider>(context, listen: false);
    final config = store.config;

    setState(() => _submitting = true);

    try {
      final itemsPayload = cart.items.values.map((item) {
        return {
          "product_id": item.product.id,
          "variant_id": item.variant?.id,
          "quantity": item.quantity,
          "price": item.unitPrice,
        };
      }).toList();

      final fullAddress = "${_addressCtrl.text.trim()}, ${_cityCtrl.text.trim()} - ${_pincodeCtrl.text.trim()}";

      final payload = {
        "customer_name": _nameCtrl.text.trim(),
        "customer_phone": _phoneCtrl.text.trim(),
        "customer_email": _emailCtrl.text.trim(),
        "shipping_address": fullAddress,
        "payment_method": _paymentMode,
        "items": itemsPayload,
      };

      final res = await ApiService().createOrder(payload);
      final orderNumber = res['order_number'] ?? res['id'] ?? 'ORD-SUCCESS';

      cart.clearCart();

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF16A34A)),
                SizedBox(width: 8),
                Text("Order Placed!"),
              ],
            ),
            content: Text(
              "Thank you for your order!\n\nYour Order ID is: $orderNumber\n\nYou can track fulfillment anytime using your phone number or Order ID.",
              style: const TextStyle(height: 1.5),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => OrderTrackingScreen(initialOrderId: orderNumber)),
                  );
                },
                child: const Text("Track Order"),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).popUntil((r) => r.isFirst);
                },
                child: const Text("Continue Shopping"),
              ),
            ],
          ),
        );
      }
    } catch (e: any) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll("Exception: ", "")),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final store = Provider.of<StoreProvider>(context);
    final primary = store.primaryColor;
    final config = store.config;

    final isCod = _paymentMode == "COD";
    final total = cart.calculateTotal(config, isCod: isCod);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Complete Your Order",
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: const BackButton(color: Color(0xFF0F172A)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Shipping Details
              const Text(
                "Shipping & Delivery Information",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    TextFormField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(labelText: "Full Name *", border: OutlineInputBorder()),
                      validator: (v) => (v == null || v.isEmpty) ? "Please enter your full name" : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: "Phone Number (WhatsApp) *", border: OutlineInputBorder()),
                      validator: (v) => (v == null || v.length < 10) ? "Please enter a valid 10-digit mobile" : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: "Email Address", border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: "Street Address / House No. *", border: OutlineInputBorder()),
                      validator: (v) => (v == null || v.isEmpty) ? "Please enter your delivery address" : null,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _cityCtrl,
                            decoration: const InputDecoration(labelText: "City *", border: OutlineInputBorder()),
                            validator: (v) => (v == null || v.isEmpty) ? "City required" : null,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextFormField(
                            controller: _pincodeCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: "Pincode *", border: OutlineInputBorder()),
                            validator: (v) => (v == null || v.length < 6) ? "6-digit pincode" : null,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Payment Methods
              const Text(
                "Payment Method",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    if (config?.codEnabled ?? true)
                      RadioListTile<String>(
                        value: "COD",
                        groupValue: _paymentMode,
                        activeColor: primary,
                        onChanged: (val) => setState(() => _paymentMode = val!),
                        title: const Text("Cash on Delivery (COD)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text(
                          config?.codCharge != null && config!.codCharge > 0
                              ? "+ ₹${config.codCharge.toStringAsFixed(0)} COD fee"
                              : "Pay cash upon delivery",
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                    if (config?.razorpayEnabled ?? false)
                      RadioListTile<String>(
                        value: "RAZORPAY",
                        groupValue: _paymentMode,
                        activeColor: primary,
                        onChanged: (val) => setState(() => _paymentMode = val!),
                        title: const Text("Online Payment (UPI, Cards, NetBanking)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: const Text("Instant and secure via Razorpay", style: TextStyle(fontSize: 11)),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Total & Submit
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Amount Payable", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        Text("₹${total.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.black, fontSize: 19)),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _submitting ? null : _handlePlaceOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _submitting
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text("Confirm & Place Order", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}
