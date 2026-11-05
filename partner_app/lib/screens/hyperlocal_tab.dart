import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HyperlocalTab extends StatefulWidget {
  const HyperlocalTab({super.key});

  @override
  State<HyperlocalTab> createState() => _HyperlocalTabState();
}

class _HyperlocalTabState extends State<HyperlocalTab> {
  bool _isLoading = true;
  bool _isSaving = false;

  bool _hyperlocalEnabled = true;
  String _mode = 'radius';
  double _radiusKm = 10.0;
  final _latController = TextEditingController();
  final _lngController = TextEditingController();
  final _locationNameController = TextEditingController();
  final _pincodesController = TextEditingController();
  final _baseFeeController = TextEditingController(text: '30');
  final _baseDistController = TextEditingController(text: '3');
  final _extraFeeController = TextEditingController(text: '10');

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _latController.dispose();
    _lngController.dispose();
    _locationNameController.dispose();
    _pincodesController.dispose();
    _baseFeeController.dispose();
    _baseDistController.dispose();
    _extraFeeController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getHyperlocalSettings();
      if (data.isNotEmpty) {
        setState(() {
          _hyperlocalEnabled = data['hyperlocal_enabled'] ?? true;
          _mode = data['hyperlocal_mode'] ?? 'radius';
          _radiusKm = (data['max_delivery_radius_km'] as num?)?.toDouble() ?? 10.0;
          _latController.text = data['store_latitude'] != null ? data['store_latitude'].toString() : '';
          _lngController.text = data['store_longitude'] != null ? data['store_longitude'].toString() : '';
          _locationNameController.text = data['store_location_name'] ?? '';
          _pincodesController.text = data['serviceable_pincodes'] ?? '';
          _baseFeeController.text = (data['base_delivery_fee'] ?? 30).toString();
          _baseDistController.text = (data['base_distance_km'] ?? 3).toString();
          _extraFeeController.text = (data['per_km_fee'] ?? 10).toString();
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    final payload = {
      'hyperlocal_enabled': _hyperlocalEnabled,
      'hyperlocal_mode': _mode,
      'max_delivery_radius_km': _radiusKm,
      'store_latitude': double.tryParse(_latController.text),
      'store_longitude': double.tryParse(_lngController.text),
      'store_location_name': _locationNameController.text.trim(),
      'serviceable_pincodes': _pincodesController.text.trim(),
      'base_delivery_fee': double.tryParse(_baseFeeController.text) ?? 30.0,
      'base_distance_km': double.tryParse(_baseDistController.text) ?? 3.0,
      'per_km_fee': double.tryParse(_extraFeeController.text) ?? 10.0,
    };

    final success = await ApiService.updateHyperlocalSettings(payload);
    if (!mounted) return;
    setState(() => _isSaving = false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Hyperlocal delivery settings saved!' : 'Failed to update settings.'),
        backgroundColor: success ? const Color(0xFF059669) : const Color(0xFFDC2626),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        body: Center(child: CircularProgressIndicator(color: Color(0xFFF43F5E))),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Local Quick Delivery', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Master Toggle Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Accept Local Deliveries', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      const SizedBox(height: 2),
                      Text(
                        _hyperlocalEnabled ? 'Customers in your radius can order' : 'Local deliveries paused',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  Switch(
                    value: _hyperlocalEnabled,
                    activeColor: const Color(0xFFF43F5E),
                    activeTrackColor: const Color(0xFFFECDD3),
                    onChanged: (val) => setState(() => _hyperlocalEnabled = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Delivery Radius Slider
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Max Delivery Radius', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF1F2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFFECDD3)),
                        ),
                        child: Text(
                          '${_radiusKm.round()} km',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFFBE123C)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Slider(
                    value: _radiusKm,
                    min: 1.0,
                    max: 50.0,
                    divisions: 49,
                    activeColor: const Color(0xFFF43F5E),
                    inactiveColor: const Color(0xFFE2E8F0),
                    onChanged: (val) => setState(() => _radiusKm = val),
                  ),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('1 km (Nearby)', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.w700)),
                      Text('50 km (Metro)', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.w700)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Store GPS Coordinates Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('STORE GPS COORDINATES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _latController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            labelText: 'Latitude',
                            hintText: '18.5204',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _lngController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            labelText: 'Longitude',
                            hintText: '73.8567',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _locationNameController,
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'Store Landmark / Outlet Area',
                      hintText: 'e.g. Shivaji Nagar, Market Yard',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Serviceable Pincodes Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SPECIFIC SERVICEABLE PINCODES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _pincodesController,
                    maxLines: 2,
                    style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
                    decoration: InputDecoration(
                      hintText: 'e.g. 411001, 411002, 411038',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Optional: Leave blank to allow all pincodes within your distance radius.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Delivery Fee Slabs
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('DISTANCE-BASED DELIVERY CHARGES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _baseFeeController,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            labelText: 'Base Fee (Rs.)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _baseDistController,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            labelText: 'Up to (KM)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _extraFeeController,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            labelText: '+Rs./KM after',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Save Button
            ElevatedButton(
              onPressed: _isSaving ? null : _saveSettings,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF43F5E),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: _isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Save Local Delivery Rules', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

