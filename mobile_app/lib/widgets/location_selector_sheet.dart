import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/store_provider.dart';
import '../providers/cart_provider.dart';

class LocationSelectorSheet extends StatefulWidget {
  const LocationSelectorSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const LocationSelectorSheet(),
    );
  }

  @override
  State<LocationSelectorSheet> createState() => _LocationSelectorSheetState();
}

class _LocationSelectorSheetState extends State<LocationSelectorSheet> {
  final _pincodeCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  bool _isChecking = false;

  @override
  void initState() {
    super.initState();
    final store = Provider.of<StoreProvider>(context, listen: false);
    if (store.selectedPincode != null) {
      _pincodeCtrl.text = store.selectedPincode!;
    }
    if (store.selectedAddress != null) {
      _addressCtrl.text = store.selectedAddress!;
    }
  }

  @override
  void dispose() {
    _pincodeCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _applyLocation() async {
    final pincode = _pincodeCtrl.text.trim();
    if (pincode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please enter a valid 6-digit delivery pincode")),
      );
      return;
    }

    setState(() => _isChecking = true);
    final store = Provider.of<StoreProvider>(context, listen: false);
    final cart = Provider.of<CartProvider>(context, listen: false);

    await store.setLocation(
      pincode: pincode,
      address: _addressCtrl.text.trim().isNotEmpty ? _addressCtrl.text.trim() : null,
      cartTotal: cart.subtotal,
    );

    if (mounted) {
      setState(() => _isChecking = false);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final config = store.config;
    final primary = store.primaryColor;
    final eligibility = store.hyperlocalEligibility;

    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, 24 + bottomPadding),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Title
            Row(
              children: [
                Icon(Icons.location_on, color: primary, size: 24),
                const SizedBox(width: 8),
                const Text(
                  "Choose Delivery Location",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              config?.storeLocationName != null && config!.storeLocationName!.isNotEmpty
                  ? "Delivering from: ${config.storeLocationName}"
                  : "Check if this store delivers to your doorstep",
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),

            // Live status badge if already checked
            if (eligibility != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: eligibility.isDeliverable
                      ? const Color(0xFFF0FDF4)
                      : const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: eligibility.isDeliverable
                        ? const Color(0xFF86EFAC)
                        : const Color(0xFFFCA5A5),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      eligibility.isDeliverable
                          ? Icons.check_circle_rounded
                          : Icons.error_outline_rounded,
                      color: eligibility.isDeliverable
                          ? const Color(0xFF16A34A)
                          : const Color(0xFFDC2626),
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            eligibility.isDeliverable
                                ? "Serviceable Location (${eligibility.estimatedTimeText})"
                                : "Delivery Unavailable",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: eligibility.isDeliverable
                                  ? const Color(0xFF15803D)
                                  : const Color(0xFFB91C1C),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            eligibility.isDeliverable
                                ? (eligibility.distanceKm != null
                                    ? "${eligibility.distanceKm} km away | Delivery fee: Rs. ${eligibility.deliveryFee.toStringAsFixed(0)}"
                                    : "Express local delivery available")
                                : (eligibility.reason ?? "Outside serviceable delivery area"),
                            style: TextStyle(
                              fontSize: 11,
                              color: eligibility.isDeliverable
                                  ? const Color(0xFF166534)
                                  : const Color(0xFF991B1B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Pincode Input
            const Text(
              "Postal Pincode",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _pincodeCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: InputDecoration(
                hintText: "Enter 6-digit Pincode (e.g. 411004)",
                counterText: "",
                prefixIcon: const Icon(Icons.pin_drop_outlined, size: 20),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: primary, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Optional Landmark / Area text
            const Text(
              "Area / Landmark (Optional)",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _addressCtrl,
              decoration: InputDecoration(
                hintText: "e.g. Shivaji Nagar, FC Road",
                prefixIcon: const Icon(Icons.apartment_outlined, size: 20),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: primary, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Apply Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isChecking ? null : _applyLocation,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isChecking
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Text(
                        "Set Location & Check",
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
