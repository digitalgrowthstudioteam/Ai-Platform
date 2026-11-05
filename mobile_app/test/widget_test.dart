import 'package:flutter_test/flutter_test.dart';
import 'package:dgs_store_app/main.dart';

void main() {
  testWidgets('Store app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const DgsStoreApp());
  });
}
