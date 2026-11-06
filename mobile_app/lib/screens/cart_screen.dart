import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/smart_store_image.dart';
import '../widgets/location_selector_sheet.dart';
import 'checkout_screen.dart';
import 'login_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _couponCtrl = TextEditingController(text: "Fresh01");
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
    if (code == "FRESH01" || code == "FIRST10") {
      setState(() {
        _couponApplied = true;
        _couponDiscount = (subtotal * 0.15).roundToDouble();
        _couponMessage = "Coupon $code applied! 15% fresh produce discount unlocked 🎉";
      });
    } else {
      setState(() {
        _couponApplied = false;
        _couponDiscount = 0.0;
        _couponMessage = "Invalid promo code. Try Fresh01.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final store = Provider.of<StoreProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    const primaryGreen = Color(0xFF15803D);
    const sageBg = Color(0xFFEDF4EE);
    const textDark = Color(0xFF111827);

    final config = store.config;
    final eligibility = store.hyperlocalEligibility;
    final isHyperlocal = store.isHyperlocalActive;

    final double shipping;
    if (isHyperlocal && eligibility != null && eligibility.locationServiceable) {
      shipping = eligibility.deliveryFee;
    } else {
      shipping = cart.calculateShipping(config);
    }

    final subtotal = cart.subtotal;
    final effectiveDiscount = _couponApplied ? _couponDiscount : 0.0;
    final totalPayable = (subtotal - effectiveDiscount + shipping).clamp(0.0, double.infinity);
    final bool cannotDeliver = isHyperlocal && eligibility != null && !eligibility.isDeliverable;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: textDark, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          "Checkout",
          style: TextStyle(
            color: textDark,
            fontWeight: FontWeight.w900,
            fontSize: 18,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.shopping_bag_outlined, color: textDark, size: 22),
                if (cart.itemCount > 0)
                  Positioned(
                    right: -4,
                    top: -2,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: primaryGreen,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      child: Text(
                        '${cart.itemCount}',
                        style: const TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            onPressed: () {},
          ),
        ],
      ),
      body: cart.items.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: const BoxDecoration(
                        color: sageBg,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.shopping_bag_outlined, size: 48, color: primaryGreen),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      "Your Cart is Empty",
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: textDark),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Explore fresh vegetables and fruits delivered to your doorstep in 15-25 minutes.",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      height: 52,
                      width: 220,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryGreen,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                        ),
                        child: const Text("SHOP PRODUCE", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : Column(
              children: [
                // Hyperlocal Geofencing Alert Banner
                if (isHyperlocal)
                  InkWell(
                    onTap: () => LocationSelectorSheet.show(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      color: cannotDeliver ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                      child: Row(
                        children: [
                          Icon(
                            cannotDeliver ? Icons.error_outline_rounded : Icons.bolt_rounded,
                            color: cannotDeliver ? const Color(0xFFDC2626) : primaryGreen,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              cannotDeliver
                                  ? "Current location outside service area (Max 15km). Tap to change."
                                  : "⚡ Express 15-25 Mins delivery to ${store.deliveryLocationDisplayText}",
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.bold,
                                color: cannotDeliver ? const Color(0xFFB91C1C) : primaryGreen,
                              ),
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFF94A3B8)),
                        ],
                      ),
                    ),
                  ),

                // Cart Items List (Matching Reference Screen 3)
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (context, idx) {
                      final key = cart.items.keys.elementAt(idx);
                      final item = cart.items[key]!;
                      final p = item.product;
                      final int qty = item.quantity;

                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // Product Image Container (Pale Sage Background with Trash Icon)
                            Stack(
                              children: [
                                Container(
                                  width: 84,
                                  height: 84,
                                  decoration: BoxDecoration(
                                    color: sageBg,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  padding: const EdgeInsets.all(8),
                                  child: SmartStoreImage(
                                    imageUrl: p.primaryImage,
                                    fit: BoxFit.contain,
                                    fallbackText: "VG",
                                  ),
                                ),
                                Positioned(
                                  top: 4,
                                  right: 4,
                                  child: InkWell(
                                    onTap: () => cart.removeItem(p.id),
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      width: 22,
                                      height: 22,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.9),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.delete_outline_rounded, size: 13, color: Color(0xFF94A3B8)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 14),

                            // Details & Stepper (Matching Screen 3)
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Product Title
                                  Text(
                                    p.title,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: textDark,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),

                                  // Unit Badge (e.g. "1kg" or "500gm")
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Text(
                                      "500gm",
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),

                                  // Price & Stepper Row
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        "₹${(p.effectivePrice * qty).toStringAsFixed(0)}",
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w900,
                                          color: textDark,
                                        ),
                                      ),

                                      // Stepper [-]  qty  [+]
                                      Row(
                                        children: [
                                          InkWell(
                                            onTap: () => cart.updateQuantity(p.id, qty - 1),
                                            borderRadius: BorderRadius.circular(14),
                                            child: Container(
                                              width: 28,
                                              height: 28,
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(14),
                                              ),
                                              child: const Icon(Icons.remove, size: 14, color: textDark),
                                            ),
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 10),
                                            child: Text(
                                              "$qty",
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w900,
                                                color: textDark,
                                              ),
                                            ),
                                          ),
                                          InkWell(
                                            onTap: () => cart.updateQuantity(p.id, qty + 1),
                                            borderRadius: BorderRadius.circular(14),
                                            child: Container(
                                              width: 28,
                                              height: 28,
                                              decoration: BoxDecoration(
                                                color: textDark,
                                                borderRadius: BorderRadius.circular(14),
                                              ),
                                              child: const Icon(Icons.add, size: 14, color: Colors.white),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // Bottom Panel: Promo Code, Breakdown, & "CHECK OUT" Button
                Container(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 16,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Promo Code Card (Matching Reference Screen 3)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _couponCtrl,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: textDark),
                                decoration: const InputDecoration(
                                  hintText: "Promo Code",
                                  hintStyle: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                                  border: InputBorder.none,
                                  isDense: true,
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: () => _applyCoupon(subtotal),
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: textDark,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  _couponApplied ? "Applied" : "Fresh01",
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_couponMessage != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            _couponMessage!,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _couponApplied ? primaryGreen : const Color(0xFFDC2626),
                            ),
                          ),
                        ),
                      const SizedBox(height: 14),

                      // Breakdown Rows
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Sub Total", style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                          Text("₹${subtotal.toStringAsFixed(0)}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: textDark)),
                        ],
                      ),
                      if (_couponApplied) ...[
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Promo Discount", style: TextStyle(fontSize: 13, color: primaryGreen, fontWeight: FontWeight.w600)),
                            Text("-₹${_couponDiscount.toStringAsFixed(0)}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: primaryGreen)),
                          ],
                        ),
                      ],
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Shipping", style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                          Text(
                            shipping == 0 ? "FREE" : "₹${shipping.toStringAsFixed(0)}",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: shipping == 0 ? primaryGreen : textDark,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 18, color: Color(0xFFF1F5F9)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Total Amount", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: textDark)),
                          Text(
                            "₹${totalPayable.toStringAsFixed(0)}",
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: primaryGreen),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Large Rounded "CHECK OUT" Button (Matching Screen 3)
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: cannotDeliver
                              ? null
                              : () {
                                  if (!auth.isLoggedIn) {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => const LoginScreen(
                                          promptMessage: "Sign in to complete your order or continue as guest.",
                                          redirectTo: CheckoutScreen(),
                                        ),
                                      ),
                                    );
                                  } else {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                                    );
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryGreen,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: const Color(0xFFE2E8F0),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(27)),
                          ),
                          child: Text(
                            cannotDeliver ? "DELIVERY UNAVAILABLE AT LOCATION" : "CHECK OUT",
                            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900, letterSpacing: 1.0),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
