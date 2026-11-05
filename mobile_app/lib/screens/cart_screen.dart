import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/smart_store_image.dart';
import 'checkout_screen.dart';
import 'login_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _couponCtrl = TextEditingController();
  bool _couponApplied = false;
  double _couponDiscount = 0.0;
  String? _couponMessage;

  @override
  void dispose() {
    _couponCtrl.dispose();
    super.dispose();
  }

  void _applyCoupon(double subtotal) {
    final code = _couponCtrl.text.trim().toUpperCase();
    if (code == "FIRST10") {
      setState(() {
        _couponApplied = true;
        _couponDiscount = (subtotal * 0.10).roundToDouble();
        _couponMessage = "Coupon FIRST10 applied! 10% discount added.";
      });
    } else {
      setState(() {
        _couponApplied = false;
        _couponDiscount = 0.0;
        _couponMessage = "Invalid coupon code. Try FIRST10.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final store = Provider.of<StoreProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final primary = store.primaryColor;
    final config = store.config;

    final freeShippingThreshold = config?.freeShippingMinOrder ?? 999.0;
    final shipping = cart.calculateShipping(config);
    final subtotal = cart.subtotal;
    final remainingForFreeShipping = freeShippingThreshold - subtotal;

    final effectiveDiscount = _couponApplied ? _couponDiscount : 0.0;
    final totalPayable = (subtotal - effectiveDiscount + shipping).clamp(0.0, double.infinity);

    return Scaffold(
      backgroundColor: const Color(0xFFFDFCFB),
      appBar: AppBar(
        title: const Text(
          "Shopping Bag",
          style: TextStyle(color: Color(0xFF0B192C), fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: const BackButton(color: Color(0xFF0B192C)),
        actions: [
          if (cart.items.isNotEmpty)
            TextButton(
              onPressed: () => cart.clearCart(),
              child: const Text("Clear All", style: TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
            ),
        ],
      ),
      body: cart.items.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.shopping_bag_outlined, size: 70, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 16),
                  const Text(
                    "Your Shopping Bag is Empty",
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    "Explore our handcrafted press-on nails collection",
                    style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text("Explore Nails", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // 1. Free Shipping Progress Bar
                Container(
                  color: remainingForFreeShipping <= 0 ? const Color(0xFFF0FDF4) : const Color(0xFFFEF3C7),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        remainingForFreeShipping <= 0 ? Icons.check_circle : Icons.local_shipping_outlined,
                        size: 18,
                        color: remainingForFreeShipping <= 0 ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          remainingForFreeShipping <= 0
                              ? "Congratulations! You've unlocked FREE Shipping! 🎉"
                              : "Add ₹${remainingForFreeShipping.toStringAsFixed(0)} more to get FREE Delivery!",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: remainingForFreeShipping <= 0 ? const Color(0xFF166534) : const Color(0xFF92400E),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // 2. Items List
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, idx) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final key = cart.items.keys.elementAt(idx);
                      final item = cart.items[key]!;
                      final imgUrl = item.variant?.images.isNotEmpty == true
                          ? item.variant!.images.first
                          : item.product.primaryImage;

                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: SmartStoreImage(
                                imageUrl: imgUrl,
                                width: 68,
                                height: 68,
                                fit: BoxFit.cover,
                                fallbackText: "NAIL",
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.product.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0B192C)),
                                  ),
                                  if (item.variant != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        "Size: ${item.variant!.title}",
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                      ),
                                    ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "₹${item.unitPrice.toStringAsFixed(0)}",
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF0B192C)),
                                  ),
                                ],
                              ),
                            ),
                            // Qty controls
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 20, color: Color(0xFF64748B)),
                                  onPressed: () => cart.updateQuantity(key, item.quantity - 1),
                                ),
                                Text(
                                  "${item.quantity}",
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 20, color: Color(0xFF0B192C)),
                                  onPressed: () => cart.updateQuantity(key, item.quantity + 1),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // 3. Coupon Code Input & Order Summary
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(15),
                        offset: const Offset(0, -3),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Column(
                      children: [
                        // Coupon Code Field
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _couponCtrl,
                                textCapitalization: TextCapitalization.characters,
                                decoration: InputDecoration(
                                  hintText: "Enter Coupon (e.g. FIRST10)",
                                  hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                  isDense: true,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: () => _applyCoupon(subtotal),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0B192C),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text("Apply", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        if (_couponMessage != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              _couponMessage!,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _couponApplied ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                              ),
                            ),
                          ),
                        const SizedBox(height: 12),

                        // Subtotal
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Bag Subtotal", style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                            Text("₹${subtotal.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                        if (_couponApplied) ...[
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Coupon Discount (FIRST10)", style: TextStyle(color: Color(0xFF16A34A), fontSize: 13, fontWeight: FontWeight.bold)),
                              Text("- ₹${_couponDiscount.toStringAsFixed(0)}", style: const TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Delivery Charges", style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                            Text(
                              shipping == 0 ? "FREE" : "₹${shipping.toStringAsFixed(0)}",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: shipping == 0 ? const Color(0xFF16A34A) : const Color(0xFF0B192C),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 18),

                        // Total Payable
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Total Payable", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0B192C))),
                            Text(
                              "₹${totalPayable.toStringAsFixed(0)}",
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF0B192C)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Proceed to Checkout (Prompt login if not signed in)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              if (auth.isLoggedIn) {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => CheckoutScreen(couponDiscount: effectiveDiscount),
                                  ),
                                );
                              } else {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => LoginScreen(
                                      promptMessage: "Please sign in to complete your order and track delivery.",
                                      redirectTo: CheckoutScreen(couponDiscount: effectiveDiscount),
                                    ),
                                  ),
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFDB2777), // Glam Pink
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 2,
                            ),
                            child: const Text("PROCEED TO CHECKOUT →", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
