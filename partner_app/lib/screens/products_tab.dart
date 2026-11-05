import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/vendor_models.dart';
import '../providers/catalog_provider.dart';

class ProductsTab extends StatefulWidget {
  const ProductsTab({super.key});

  @override
  State<ProductsTab> createState() => _ProductsTabState();
}

class _ProductsTabState extends State<ProductsTab> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CatalogProvider>(context, listen: false).fetchProducts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final catalog = Provider.of<CatalogProvider>(context);
    final products = catalog.products;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Catalog & Stock', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF475569)),
            onPressed: () => catalog.fetchProducts(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => catalog.setSearchQuery(val),
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search products by name or SKU...',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Product List
          Expanded(
            child: catalog.isLoading && products.isEmpty
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
                : products.isEmpty
                    ? const Center(
                        child: Text(
                          'No products found.',
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: products.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          return _buildProductCard(context, products[index], catalog);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, VendorProductModel product, CatalogProvider catalog) {
    final inStock = product.isInStock;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Thumbnail or Placeholder
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: product.thumbnailUrl != null && product.thumbnailUrl!.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(product.thumbnailUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.image_outlined, color: Color(0xFF94A3B8))),
                    )
                  : const Icon(Icons.inventory_2_outlined, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(width: 12),

            // Product Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'SKU: ${product.sku.isEmpty ? "N/A" : product.sku}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Rs. ${product.regularPrice.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF4F46E5)),
                  ),
                ],
              ),
            ),

            // Quick Stock Switch
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  inStock ? 'IN STOCK' : 'OUT OF STOCK',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: inStock ? const Color(0xFF059669) : const Color(0xFFDC2626),
                  ),
                ),
                Switch(
                  value: inStock,
                  activeColor: const Color(0xFF059669),
                  activeTrackColor: const Color(0xFFA7F3D0),
                  inactiveThumbColor: const Color(0xFF94A3B8),
                  inactiveTrackColor: const Color(0xFFE2E8F0),
                  onChanged: (val) {
                    catalog.toggleProductStock(product.id, val);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

