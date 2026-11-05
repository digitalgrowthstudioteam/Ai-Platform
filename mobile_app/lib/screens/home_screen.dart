import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/store_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../models/store_models.dart';
import '../widgets/smart_store_image.dart';
import '../widgets/sizing_guide_sheet.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';
import 'order_tracking_screen.dart';
import 'profile_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Future<void> _launchWhatsApp(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final uri = Uri.parse("https://wa.me/91$clean?text=Hi%20Glam%20Stree!%20I%20am%20browsing%20your%20app%20and%20need%20help%20with%20sizing.");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final cart = Provider.of<CartProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final primary = store.primaryColor;
    final supportPhone = store.config?.contactPhone ?? "7499904962";

    return Scaffold(
      backgroundColor: const Color(0xFFFDFCFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        titleSpacing: 12,
        title: Row(
          children: [
            // Standard Left-Aligned Store Logo
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SmartStoreImage(
                imageUrl: store.config?.logoUrl,
                width: 36,
                height: 36,
                fit: BoxFit.cover,
                fallbackText: "GS",
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    store.config?.storeName ?? "Glam stree nails",
                    style: const TextStyle(
                      color: Color(0xFF0B192C),
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Text(
                    "Luxury Press-On Studio",
                    style: TextStyle(
                      color: Color(0xFFDB2777),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // User Profile / Login
          IconButton(
            icon: Icon(
              auth.isLoggedIn ? Icons.account_circle : Icons.person_outline,
              color: auth.isLoggedIn ? const Color(0xFF0B192C) : const Color(0xFF64748B),
            ),
            tooltip: auth.isLoggedIn ? auth.displayName : "Sign In",
            onPressed: () {
              if (auth.isLoggedIn) {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              } else {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const LoginScreen(
                      promptMessage: "Sign in to view your orders, saved addresses, and profile.",
                      redirectTo: ProfileScreen(),
                    ),
                  ),
                );
              }
            },
          ),

          // Order Tracking
          IconButton(
            icon: const Icon(Icons.receipt_long_outlined, color: Color(0xFF475569)),
            tooltip: "Track Order",
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const OrderTrackingScreen()),
              );
            },
          ),

          // Shopping Cart with dynamic badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_bag_outlined, color: Color(0xFF0B192C)),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CartScreen()),
                  );
                },
              ),
              if (cart.itemCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Color(0xFFDB2777),
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${cart.itemCount}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => store.initializeStore(),
        color: primary,
        child: CustomScrollView(
          slivers: [
            // 1. Top Announcement Bar (matching website)
            SliverToBoxAdapter(
              child: Container(
                color: const Color(0xFF0B192C),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDB2777).withAlpha(80),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        "OFFER",
                        style: TextStyle(color: Color(0xFFF472B6), fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        "Flat 10% off with FIRST10 | Free Shipping above ₹999",
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 2. Search Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                child: TextField(
                  onChanged: (val) => store.searchProducts(val),
                  decoration: InputDecoration(
                    hintText: "Search press-on nails, shapes, colors...",
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                  ),
                ),
              ),
            ),

            // 3. Dynamic Promo Banners Carousel (direct from vendor dashboard)
            if (store.banners.isNotEmpty)
              SliverToBoxAdapter(
                child: Container(
                  height: 165,
                  margin: const EdgeInsets.only(top: 8, bottom: 4),
                  child: PageView.builder(
                    itemCount: store.banners.length,
                    controller: PageController(viewportFraction: 0.92),
                    itemBuilder: (context, idx) {
                      final b = store.banners[idx];
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(20),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              SmartStoreImage(
                                imageUrl: b.imageUrl,
                                fit: BoxFit.cover,
                                fallbackText: "GLAM STREE",
                              ),
                              // Gradient Overlay
                              Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [
                                      Colors.transparent,
                                      Colors.black.withAlpha(180),
                                    ],
                                  ),
                                ),
                              ),
                              // Banner Text & Promo Tag
                              Positioned(
                                left: 14,
                                right: 14,
                                bottom: 12,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (b.promoOffer != null && b.promoOffer!.isNotEmpty)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                        margin: const EdgeInsets.only(bottom: 4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFDB2777),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          b.promoOffer!.toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 9,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                    Text(
                                      b.title,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (b.subtitle != null && b.subtitle!.isNotEmpty)
                                      Text(
                                        b.subtitle!,
                                        style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

            // 4. Nail Sizing Guide Shortcut Action
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: InkWell(
                  onTap: () => SizingGuideSheet.show(context),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7), // Warm Gold Tint
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.straighten, color: Color(0xFFD97706), size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            "Nail Shape & Sizing Guide — Find your custom mm fit",
                            style: TextStyle(
                              color: Color(0xFF92400E),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFFD97706)),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // 5. Categories Filter
            if (store.categories.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: SizedBox(
                    height: 38,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: store.categories.length + 1,
                      itemBuilder: (context, idx) {
                        if (idx == 0) {
                          final isAll = store.selectedCategory == null;
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: ChoiceChip(
                              label: const Text("All Nails"),
                              selected: isAll,
                              onSelected: (_) => store.selectCategory(null),
                              selectedColor: primary,
                              labelStyle: TextStyle(
                                color: isAll ? Colors.white : const Color(0xFF334155),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          );
                        }
                        final cat = store.categories[idx - 1];
                        final isSelected = store.selectedCategory == cat.slug;
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: ChoiceChip(
                            label: Text(cat.name),
                            selected: isSelected,
                            onSelected: (_) => store.selectCategory(isSelected ? null : cat.slug),
                            selectedColor: primary,
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : const Color(0xFF334155),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),

            // 6. Section Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      store.selectedCategory != null
                          ? "Category Collection"
                          : "Handcrafted Luxury Nails",
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0B192C),
                      ),
                    ),
                    Text(
                      "${store.products.length} products",
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ),

            // 7. Products 2-Column Grid
            if (store.loading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF0B192C)),
                ),
              )
            else if (store.products.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.category_outlined, size: 54, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 12),
                      const Text(
                        "No nails found in this collection",
                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                      ),
                      TextButton(
                        onPressed: () => store.selectCategory(null),
                        child: const Text("View All Nails"),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.62,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, idx) {
                      final product = store.products[idx];
                      return _buildProductCard(context, product, cart);
                    },
                    childCount: store.products.length,
                  ),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _launchWhatsApp(supportPhone),
        backgroundColor: const Color(0xFF16A34A), // WhatsApp Green
        foregroundColor: Colors.white,
        icon: const Icon(Icons.chat, size: 20),
        label: const Text("WhatsApp Sizing", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, ProductItem p, CartProvider cart) {
    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)),
        );
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(10),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with Discount Badge
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                    child: SmartStoreImage(
                      imageUrl: p.primaryImage,
                      fit: BoxFit.cover,
                      fallbackText: "GLAM",
                    ),
                  ),
                  // Discount Badge
                  if (p.discountPercentage > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDB2777),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          "${p.discountPercentage}% OFF",
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                  // Free Kit Pill
                  Positioned(
                    bottom: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(180),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        "Free Kit Included",
                        style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Details
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Rating
                  Row(
                    children: const [
                      Icon(Icons.star, color: Color(0xFFEAB308), size: 12),
                      SizedBox(width: 3),
                      Text("5.0 (24)", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Title
                  Text(
                    p.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0B192C),
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),

                  // Pricing & Add Button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "₹${p.effectivePrice.toStringAsFixed(0)}",
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0B192C),
                            ),
                          ),
                          if (p.regularPrice > p.effectivePrice)
                            Text(
                              "₹${p.regularPrice.toStringAsFixed(0)}",
                              style: const TextStyle(
                                fontSize: 10,
                                decoration: TextDecoration.lineThrough,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                        ],
                      ),
                      // Quick Add Button
                      InkWell(
                        onTap: () {
                          cart.addToCart(p);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text("${p.title} added to bag!"),
                              duration: const Duration(milliseconds: 1400),
                              backgroundColor: const Color(0xFF0B192C),
                              action: SnackBarAction(
                                label: "VIEW BAG",
                                textColor: const Color(0xFFF472B6),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const CartScreen()),
                                  );
                                },
                              ),
                            ),
                          );
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0B192C),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            "ADD",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
