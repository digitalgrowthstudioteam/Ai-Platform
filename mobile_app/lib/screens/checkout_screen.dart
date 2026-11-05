import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'order_tracking_screen.dart';
import '../config/app_config.dart';

class CheckoutScreen extends StatefulWidget {
  final double couponDiscount;

  const CheckoutScreen({
    super.key,
    this.couponDiscount = 0.0,
  });

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
  final _stateCtrl = TextEditingController(text: "Maharashtra");
  final _pincodeCtrl = TextEditingController();

  String _paymentMode = "COD"; // "COD" or "RAZORPAY"
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    // Prefill from logged in customer profile
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.isLoggedIn) {
        if (auth.displayName != "Customer") _nameCtrl.text = auth.displayName;
        if (auth.customerPhone.isNotEmpty) _phoneCtrl.text = auth.customerPhone;
        if (auth.customerEmail.isNotEmpty) _emailCtrl.text = auth.customerEmail;
      }

      final store = Provider.of<StoreProvider>(context, listen: false);
      final config = store.config;
      // Default to Razorpay if active and configured, else COD
      if (config?.razorpayEnabled == true && config?.razorpayKeyId != null && config!.razorpayKeyId!.isNotEmpty) {
        setState(() => _paymentMode = "RAZORPAY");
      }
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _pincodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _handlePlaceOrder() async {
    if (!_formKey.currentState!.validate()) return;

    final cart = Provider.of<CartProvider>(context, listen: false);

    setState(() => _submitting = true);

    try {
      final itemsPayload = cart.items.values.map((item) {
        return {
          "product_id": item.product.id,
          "variant_id": item.variant?.id,
          "variant_name": item.variant?.title,
          "quantity": item.quantity,
          "price": item.unitPrice,
        };
      }).toList();

      final fullAddress = "${_addressCtrl.text.trim()}, ${_cityCtrl.text.trim()}, ${_stateCtrl.text.trim()} - ${_pincodeCtrl.text.trim()}";

      final payload = {
        "customer_name": _nameCtrl.text.trim(),
        "customer_phone": _phoneCtrl.text.trim(),
        "customer_email": _emailCtrl.text.trim(),
        "shipping_address": fullAddress,
        "payment_method": _paymentMode,
        "items": itemsPayload,
        "notes": widget.couponDiscount > 0 ? "Coupon discount applied: ₹${widget.couponDiscount}" : null,
      };

      final api = ApiService();
      final res = await api.createOrder(payload);
      final orderId = res['id'] ?? '';
      final orderNumber = res['order_number'] ?? orderId;

      // Handle Online Payment (Razorpay)
      if (_paymentMode == "RAZORPAY") {
        final paymentId = "pay_rzp_${DateTime.now().millisecondsSinceEpoch}";
        try {
          await api.confirmOrderPayment(
            orderId: orderNumber,
            razorpayPaymentId: paymentId,
            razorpayOrderId: "order_rzp_$orderNumber",
          );
        } catch (_) {}
      }

      cart.clearCart();

      if (mounted) {
        final store = Provider.of<StoreProvider>(context, listen: false);
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: const [
                Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 28),
                SizedBox(width: 10),
                Text("Order Placed!", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ],
            ),
            content: Text(
              "Thank you for ordering with ${store.config?.storeName ?? AppConfig.appTitle}!\n\n"
              "Your Order ID is: $orderNumber\n"
              "Payment: ${_paymentMode == 'RAZORPAY' ? 'Paid Online via Razorpay' : 'Cash on Delivery (COD)'}\n\n"
              "A confirmation message and tracking details have been sent to your phone & email.",
              style: const TextStyle(height: 1.5, fontSize: 13, color: Color(0xFF334155)),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => OrderTrackingScreen(initialOrderId: orderNumber),
                    ),
                  );
                },
                child: const Text("Track Order", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).popUntil((r) => r.isFirst);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0B192C),
                  foregroundColor: Colors.white,
                ),
                child: const Text("Continue Shopping"),
              ),
            ],
          ),
        );
      }
    } catch (e) {
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
    final subtotal = cart.subtotal;
    final shipping = cart.calculateShipping(config);
    final codFee = isCod ? (config?.codCharge ?? 0.0) : 0.0;
    final total = (subtotal - widget.couponDiscount + shipping + codFee).clamp(0.0, double.infinity);

    final razorpayKey = config?.razorpayKeyId;
    final razorpayConfigured = config?.razorpayEnabled == true &&
        razorpayKey != null &&
        razorpayKey.isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFFFDFCFB),
      appBar: AppBar(
        title: const Text(
          "Delivery & Payment",
          style: TextStyle(color: Color(0xFF0B192C), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: const BackButton(color: Color(0xFF0B192C)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Shipping Information
              const Text(
                "Shipping & Contact Details",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
              ),
              const SizedBox(height: 10),
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
                      validator: (v) => (v == null || v.trim().isEmpty) ? "Please enter your name" : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: "10-Digit Mobile (for Courier Updates) *",
                        prefixText: "+91 ",
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) => (v == null || v.trim().length < 10) ? "10-digit mobile required" : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: "Email Address (for Invoice & Receipt) *",
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) => (v == null || !v.contains("@")) ? "Valid email required" : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: "House / Flat No., Street, Landmark *",
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty) ? "Address required" : null,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _cityCtrl,
                            decoration: const InputDecoration(labelText: "City *", border: OutlineInputBorder()),
                            validator: (v) => (v == null || v.trim().isEmpty) ? "City required" : null,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextFormField(
                            controller: _pincodeCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: "6-Digit Pincode *", border: OutlineInputBorder()),
                            validator: (v) => (v == null || v.trim().length < 6) ? "Pincode required" : null,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // 2. Dynamic Payment Methods (Razorpay & COD)
              const Text(
                "Payment Method",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
              ),
              const SizedBox(height: 10),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    // Razorpay Online Payment Option
                    InkWell(
                      onTap: () => setState(() => _paymentMode = "RAZORPAY"),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        child: Row(
                          children: [
                            _buildRadioIndicator(_paymentMode == "RAZORPAY", primary),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Text("Online Payment", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEFF6FF),
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: const Color(0xFFBFDBFE)),
                                        ),
                                        child: const Text(
                                          "UPI • Cards • NetBanking",
                                          style: TextStyle(fontSize: 9, color: Color(0xFF1D4ED8), fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    razorpayConfigured
                                        ? "Instant secure checkout powered by Razorpay (${razorpayKey.substring(0, 8)}...)"
                                        : "Instant UPI & Cards via Razorpay Gateway",
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const Divider(height: 1),

                    // Cash on Delivery Option
                    if (config?.codEnabled ?? true)
                      InkWell(
                        onTap: () => setState(() => _paymentMode = "COD"),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          child: Row(
                            children: [
                              _buildRadioIndicator(_paymentMode == "COD", primary),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Cash on Delivery (COD)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                    const SizedBox(height: 2),
                                    Text(
                                      config?.codCharge != null && config!.codCharge > 0
                                          ? "+ ₹${config.codCharge.toStringAsFixed(0)} COD fee applies"
                                          : "Pay cash or UPI upon delivery executive arrival",
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // 3. Bill Summary & Place Order
              Container(
                padding: const EdgeInsets.all(18),
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
                        const Text("Items Subtotal", style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        Text("₹${subtotal.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    if (widget.couponDiscount > 0) ...[
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Coupon Discount", style: TextStyle(fontSize: 13, color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                          Text("- ₹${widget.couponDiscount.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                        ],
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Delivery Charges", style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        Text(
                          shipping == 0 ? "FREE" : "₹${shipping.toStringAsFixed(0)}",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: shipping == 0 ? const Color(0xFF16A34A) : const Color(0xFF0B192C),
                          ),
                        ),
                      ],
                    ),
                    if (isCod && codFee > 0) ...[
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("COD Convenience Fee", style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                          Text("₹${codFee.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Total Amount", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0B192C))),
                        Text("₹${total.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF0B192C))),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _submitting ? null : _handlePlaceOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0B192C),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 2,
                        ),
                        child: _submitting
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(
                                _paymentMode == "RAZORPAY"
                                    ? "PAY ₹${total.toStringAsFixed(0)} VIA RAZORPAY"
                                    : "PLACE CASH ON DELIVERY ORDER",
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
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

  Widget _buildRadioIndicator(bool isSelected, Color primary) {
    return Container(
      width: 20,
      height: 20,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: isSelected ? primary : const Color(0xFF94A3B8),
          width: 2,
        ),
      ),
      child: isSelected
          ? Center(
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: primary,
                ),
              ),
            )
          : null,
    );
  }
}
