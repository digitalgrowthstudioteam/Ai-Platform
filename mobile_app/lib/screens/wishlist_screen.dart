import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/wishlist_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/store_provider.dart';
import '../models/store_models.dart';
import '../widgets/smart_store_image.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final wishlist = Provider.of<WishlistProvider>(context);
    final cart = Provider.of<CartProvider>(context);
    final store = Provider.of<StoreProvider>(context);
    final primary = store.primaryColor;
    final secondary = store.secondaryColor;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "My Wishlist",
              style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 18),
            ),
            Text(
              "${wishlist.itemCount} ${wishlist.itemCount == 1 ? 'item' : 'items'} saved",
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11.5, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: const BackButton(color: Color(0xFF0F172A)),
        actions: [
          // Cart shortcut
          IconButton(
            icon: Stack(
              children: [
                const Icon(Icons.shopping_bag_outlined, color: Color(0xFF0F172A)),
                if (cart.itemCount > 0)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(color: secondary, shape: BoxShape.circle),
                      child: Text(
                        '${cart.itemCount}',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
            tooltip: "Bag",
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CartScreen()),
              );
            },
          ),
          if (wishlist.itemCount > 0)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: Color(0xFF0F172A)),
              onSelected: (val) {
                if (val == 'clear') {
                  _confirmClearWishlist(context, wishlist);
                }
              },
              itemBuilder: (_) => [
                const PopupMenuItem(
                  value: 'clear',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, size: 18, color: Color(0xFFDC2626)),
                      SizedBox(width: 8),
                      Text("Clear Wishlist", style: TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
      body: wishlist.isEmpty
          ? _buildEmptyState(context, primary)
          : GridView.builder(
              padding: const EdgeInsets.all(14),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.53,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: wishlist.items.length,
              itemBuilder: (context, idx) {
                final p = wishlist.items[idx];
                return _buildWishlistCard(context, p, wishlist, cart, primary);
              },
            ),
    );
  }

  Widget _buildEmptyState(BuildContext context, Color primary) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Icon(Icons.favorite_border, size: 48, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 20),
            const Text(
              "Your Wishlist is Empty",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            const Text(
              "Explore our Men's Apparel collection and tap the heart icon on any outfit to save it here.",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back, size: 16),
              label: const Text("Explore Collection"),
              style: ElevatedButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWishlistCard(
    BuildContext context,
    ProductItem p,
    WishlistProvider wishlist,
    CartProvider cart,
    Color primary,
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
              color: Colors.black.withAlpha(6),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with Delete/Un-wishlist button
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  child: AspectRatio(
                    aspectRatio: 1.0,
                    child: SmartStoreImage(
                      imageUrl: p.primaryImage,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      fallbackText: "AC",
                    ),
                  ),
                ),
                // Remove from wishlist button
                Positioned(
                  top: 6,
                  right: 6,
                  child: InkWell(
                    onTap: () async {
                      await wishlist.removeFromWishlist(p.id);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("${p.title} removed from wishlist"),
                            duration: const Duration(milliseconds: 1400),
                            backgroundColor: const Color(0xFF0F172A),
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
                            color: Colors.black.withAlpha(20),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.close, size: 16, color: Color(0xFF64748B)),
                    ),
                  ),
                ),
                // Discount pill
                if (p.discountPercentage > 0)
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        "${p.discountPercentage}% OFF",
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      p.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Price
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
                          const SizedBox(width: 5),
                          Text(
                            "₹${p.regularPrice.toStringAsFixed(0)}",
                            style: const TextStyle(
                              fontSize: 10,
                              decoration: TextDecoration.lineThrough,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ],
                    ),

                    const Spacer(),

                    // Move to Bag / Add to Cart Full Width Button
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
                        icon: const Icon(Icons.shopping_bag_outlined, size: 14),
                        label: const Text(
                          "Add to Cart",
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmClearWishlist(BuildContext context, WishlistProvider wishlist) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Clear Wishlist?"),
        content: const Text("Are you sure you want to remove all saved items from your wishlist?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () {
              wishlist.clearWishlist();
              Navigator.of(ctx).pop();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
            child: const Text("Clear All"),
          ),
        ],
      ),
    );
  }
}

