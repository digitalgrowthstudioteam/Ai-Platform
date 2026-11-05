import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/store_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/wishlist_provider.dart';
import '../models/store_models.dart';
import '../widgets/smart_store_image.dart';
import '../widgets/sizing_guide_sheet.dart';
import '../widgets/location_selector_sheet.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';
import 'order_tracking_screen.dart';
import 'wishlist_screen.dart';
import 'profile_screen.dart';
import 'login_screen.dart';
import '../config/app_config.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final cart = Provider.of<CartProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final wishlist = Provider.of<WishlistProvider>(context);
    final primary = store.primaryColor;

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
                    store.config?.storeName ?? AppConfig.appTitle,
                    style: TextStyle(
                      color: store.primaryColor,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    store.config?.description ?? AppConfig.appTagline,
                    style: TextStyle(
                      color: store.secondaryColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                    overflow: TextOverflow.ellipsis,
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

          // Wishlist with dynamic badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.favorite_border, color: Color(0xFF475569)),
                tooltip: "Wishlist",
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const WishlistScreen()),
                  );
                },
              ),
              if (wishlist.itemCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Color(0xFFE11D48),
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${wishlist.itemCount}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
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
            // Hyperlocal Location & Delivery Header Pill
            SliverToBoxAdapter(
              child: Material(
                color: Colors.white,
                child: InkWell(
                  onTap: () => LocationSelectorSheet.show(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.location_on, color: primary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Row(
                            children: [
                              Text(
                                "Deliver to: ",
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade600,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Flexible(
                                child: Text(
                                  store.deliveryLocationDisplayText,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 2),
                              const Icon(Icons.keyboard_arrow_down, size: 16, color: Color(0xFF64748B)),
                            ],
                          ),
                        ),
                        if (store.hyperlocalEligibility != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: store.hyperlocalEligibility!.isDeliverable
                                  ? const Color(0xFFDCFCE7)
                                  : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  store.hyperlocalEligibility!.isDeliverable
                                      ? Icons.bolt
                                      : Icons.cancel_outlined,
                                  size: 13,
                                  color: store.hyperlocalEligibility!.isDeliverable
                                      ? const Color(0xFF16A34A)
                                      : const Color(0xFFDC2626),
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  store.hyperlocalEligibility!.isDeliverable
                                      ? store.hyperlocalEligibility!.estimatedTimeText
                                      : "Unavailable",
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: store.hyperlocalEligibility!.isDeliverable
                                      ? const Color(0xFF15803D)
                                      : const Color(0xFFB91C1C),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

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
                    hintText: "Search festive kurtas, shirts, suits, jackets...",
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
                      children: [
                        const Icon(Icons.straighten, color: Color(0xFFD97706), size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            AppConfig.activeStoreSlug == "ashtekar-collection"
                                ? "Men's Apparel Size Chart — Find your tailored fit"
                                : "Nail Shape & Sizing Guide — Find your custom mm fit",
                            style: const TextStyle(
                              color: Color(0xFF92400E),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFFD97706)),
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
                              label: const Text("All Apparel"),
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
                          : "Men's Collection",
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
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
                  child: CircularProgressIndicator(color: Color(0xFF0F172A)),
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
                        "No apparel found in this collection",
                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                      ),
                      TextButton(
                        onPressed: () => store.selectCategory(null),
                        child: const Text("View All Apparel"),
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
                    childAspectRatio: 0.52,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, idx) {
                      final product = store.products[idx];
                      return _buildProductCard(context, product, cart, wishlist);
                    },
                    childCount: store.products.length,
                  ),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 40)),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(
    BuildContext context,
    ProductItem p,
    CartProvider cart,
    WishlistProvider wishlist,
  ) {
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
            // Image with Discount Badge & Wishlist Button
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                    child: SmartStoreImage(
                      imageUrl: p.primaryImage,
                      fit: BoxFit.cover,
                      fallbackText: "AC",
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
                          color: const Color(0xFFDC2626),
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
                  // Wishlist Button
                  Positioned(
                    top: 8,
                    right: 8,
                    child: InkWell(
                      onTap: () async {
                        final added = await wishlist.toggleWishlist(p);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(added ? "${p.title} added to Wishlist!" : "${p.title} removed from Wishlist"),
                              duration: const Duration(milliseconds: 1400),
                              backgroundColor: const Color(0xFF0F172A),
                              action: SnackBarAction(
                                label: "VIEW",
                                textColor: const Color(0xFFD4AF37),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const WishlistScreen()),
                                  );
                                },
                              ),
                            ),
                          );
                        }
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(235),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(25),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Icon(
                          wishlist.isWishlisted(p.id) ? Icons.favorite : Icons.favorite_border,
                          size: 16,
                          color: wishlist.isWishlisted(p.id) ? const Color(0xFFE11D48) : const Color(0xFF64748B),
                        ),
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
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),

                  // Pricing
                  Row(
                    children: [
                      Text(
                        "₹${p.effectivePrice.toStringAsFixed(0)}",
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      if (p.regularPrice > p.effectivePrice) ...[
                        const SizedBox(width: 6),
                        Text(
                          "₹${p.regularPrice.toStringAsFixed(0)}",
                          style: const TextStyle(
                            fontSize: 10.5,
                            decoration: TextDecoration.lineThrough,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Full-Width Add to Cart Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        cart.addToCart(p);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("${p.title} added to bag!"),
                            duration: const Duration(milliseconds: 1400),
                            backgroundColor: const Color(0xFF0F172A),
                            action: SnackBarAction(
                              label: "VIEW BAG",
                              textColor: const Color(0xFFD4AF37),
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => const CartScreen()),
                                );
                              },
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.shopping_bag_outlined, size: 13),
                      label: const Text(
                        "Add to Cart",
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        elevation: 0,
                      ),
                    ),
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
