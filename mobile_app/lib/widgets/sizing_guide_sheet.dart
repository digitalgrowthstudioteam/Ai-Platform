import 'package:flutter/material.dart';
import '../config/app_config.dart';

class SizingGuideSheet extends StatelessWidget {
  const SizingGuideSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SizingGuideSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isApparel = AppConfig.activeStoreSlug == "ashtekar-collection";

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.straighten, color: Color(0xFFD97706), size: 22),
                    const SizedBox(width: 8),
                    Text(
                      isApparel ? "Men's Apparel Size Guide" : "Nail Shape & Sizing Guide",
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: isApparel ? _buildApparelGuide() : _buildNailGuide(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildApparelGuide() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Measuring Steps Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF), // Soft royal blue
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                "HOW TO FIND YOUR PERFECT FIT (IN 3 EASY STEPS)",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: Color(0xFF1D4ED8),
                ),
              ),
              SizedBox(height: 8),
              Text(
                "1. Chest: Wrap the measuring tape around the fullest part of your chest under arms.\n"
                "2. Shoulder: Measure straight across the back from the edge of one shoulder to the other.\n"
                "3. Length: Measure from the highest point of your shoulder down to your desired hemline.",
                style: TextStyle(fontSize: 12.5, height: 1.5, color: Color(0xFF1E293B)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Size Chart Table
        const Text(
          "Men's Apparel Standard Size Chart (Inches)",
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 10),
        Table(
          border: TableBorder.all(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(10)),
          children: [
            const TableRow(
              decoration: BoxDecoration(color: Color(0xFFF8FAFC)),
              children: [
                Padding(
                  padding: EdgeInsets.all(10),
                  child: Text("Size", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                Padding(
                  padding: EdgeInsets.all(10),
                  child: Text("Chest", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                Padding(
                  padding: EdgeInsets.all(10),
                  child: Text("Shoulder", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                Padding(
                  padding: EdgeInsets.all(10),
                  child: Text("Length", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
            _buildApparelRow("38 (S)", "38\"", "17.5\"", "28\""),
            _buildApparelRow("40 (M)", "40\"", "18.0\"", "29\""),
            _buildApparelRow("42 (L)", "42\"", "18.5\"", "30\""),
            _buildApparelRow("44 (XL)", "44\"", "19.2\"", "31\""),
            _buildApparelRow("46 (XXL)", "46\"", "20.0\"", "32\""),
          ],
        ),
        const SizedBox(height: 24),

        // Popular Fits
        const Text(
          "Available Silhouettes & Fits",
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: const [
            _ShapeChip(title: "Slim Fit", subtitle: "Modern Sharp Silhouette"),
            _ShapeChip(title: "Classic Regular", subtitle: "Comfortable Everyday Fit"),
            _ShapeChip(title: "Festive Relaxed", subtitle: "Royal Traditional Cut"),
            _ShapeChip(title: "Tailored Custom", subtitle: "Bespoke Suiting Option"),
          ],
        ),
        const SizedBox(height: 24),

        // Free Exchange Guarantee Banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(
            children: const [
              Icon(Icons.verified, color: Color(0xFF16A34A), size: 28),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  "100% Quality Fabric Guarantee with Hassle-Free 7-Day Size Exchange on every Ashtekar Collection order!",
                  style: TextStyle(fontSize: 12, color: Color(0xFF166534), fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildNailGuide() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFFDF2F8),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFFBCFE8)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                "HOW TO MEASURE YOUR NAILS (IN 3 EASY STEPS)",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: Color(0xFFDB2777),
                ),
              ),
              SizedBox(height: 8),
              Text(
                "1. Place a piece of clear tape across the widest part of your natural nail bed.\n"
                "2. Mark the edges of your nail on the tape using a fine pen.\n"
                "3. Peel the tape off, place it flat on a ruler, and measure millimeters (mm).",
                style: TextStyle(fontSize: 12.5, height: 1.5, color: Color(0xFF334155)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text("Standard Size Chart", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0B192C))),
        const SizedBox(height: 10),
        Table(
          border: TableBorder.all(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(10)),
          children: [
            const TableRow(
              decoration: BoxDecoration(color: Color(0xFFF8FAFC)),
              children: [
                Padding(padding: EdgeInsets.all(10), child: Text("Size", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                Padding(padding: EdgeInsets.all(10), child: Text("Thumb, Index, Mid, Ring, Pinky (mm)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              ],
            ),
            _buildTableRow("XS", "14, 11, 12, 11, 8 mm (Petite)"),
            _buildTableRow("S", "15, 12, 13, 12, 9 mm (Most Common)"),
            _buildTableRow("M", "16, 13, 14, 13, 10 mm (Standard)"),
            _buildTableRow("L", "17, 14, 15, 14, 11 mm (Wide Beds)"),
          ],
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  static TableRow _buildApparelRow(String size, String chest, String shoulder, String length) {
    return TableRow(
      children: [
        Padding(padding: const EdgeInsets.all(10), child: Text(size, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
        Padding(padding: const EdgeInsets.all(10), child: Text(chest, style: const TextStyle(fontSize: 12, color: Color(0xFF475569)))),
        Padding(padding: const EdgeInsets.all(10), child: Text(shoulder, style: const TextStyle(fontSize: 12, color: Color(0xFF475569)))),
        Padding(padding: const EdgeInsets.all(10), child: Text(length, style: const TextStyle(fontSize: 12, color: Color(0xFF475569)))),
      ],
    );
  }

  static TableRow _buildTableRow(String size, String measurements) {
    return TableRow(
      children: [
        Padding(padding: const EdgeInsets.all(10), child: Text(size, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
        Padding(padding: const EdgeInsets.all(10), child: Text(measurements, style: const TextStyle(fontSize: 12, color: Color(0xFF475569)))),
      ],
    );
  }
}

class _ShapeChip extends StatelessWidget {
  final String title;
  final String subtitle;

  const _ShapeChip({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}
