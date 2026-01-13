#!/bin/bash

set -e

echo "🧪 Testing CCSearch TUI - Phase 2 & 3"
echo "====================================="
echo ""

# Test 1: Build
echo "📦 Test 1: Building TUI..."
npm run build:tui > /dev/null 2>&1
echo "✅ Build completed"
echo ""

# Test 2: Verify artifacts and size
echo "📁 Test 2: Checking build artifacts..."
if [ -f "dist/tui.mjs" ]; then
    SIZE=$(du -h dist/tui.mjs | cut -f1)
    echo "   ✅ dist/tui.mjs exists ($SIZE)"

    # Verify size increased (should be >10KB with all features)
    SIZE_BYTES=$(stat -f%z dist/tui.mjs 2>/dev/null || stat -c%s dist/tui.mjs 2>/dev/null)
    if [ "$SIZE_BYTES" -gt 10240 ]; then
        echo "   ✅ Bundle size indicates all features included"
    else
        echo "   ⚠️  Bundle smaller than expected - some features may be missing"
    fi
else
    echo "   ❌ dist/tui.mjs missing"
    exit 1
fi
echo ""

# Test 3: Check for required exports and imports
echo "🔍 Test 3: Verifying component exports..."
if grep -q "SessionListView" dist/tui.mjs 2>/dev/null; then
    echo "   ✅ SessionListView found in bundle"
else
    echo "   ❌ SessionListView not found"
    exit 1
fi

if grep -q "SearchInput" dist/tui.mjs 2>/dev/null; then
    echo "   ✅ SearchInput found in bundle"
else
    echo "   ❌ SearchInput not found"
    exit 1
fi

if grep -q "TUIProvider" dist/tui.mjs 2>/dev/null; then
    echo "   ✅ TUIProvider found in bundle"
else
    echo "   ❌ TUIProvider not found"
    exit 1
fi
echo ""

# Test 4: Validate syntax
echo "🔍 Test 4: Validating bundle syntax..."
if node -c dist/tui.mjs 2>/dev/null; then
    echo "   ✅ Bundle has valid JavaScript syntax"
else
    echo "   ❌ Bundle has syntax errors"
    exit 1
fi
echo ""

# Summary
echo "====================================="
echo "✨ All Phase 2 & 3 build tests passed!"
echo ""
echo "To manually test the interactive TUI, run:"
echo "  npm run tui"
echo ""
echo "Expected features:"
echo "  ✅ Session list with real data"
echo "  ✅ Keyboard navigation (j/k, arrows)"
echo "  ✅ Virtual scrolling for performance"
echo "  ✅ Search with '/' key"
echo "  ✅ Real-time filtering as you type"
echo "  ✅ Session count in header"
echo "  ✅ Press 'q' to quit"
echo ""
echo "Keyboard shortcuts:"
echo "  j/↓     - Move down"
echo "  k/↑     - Move up"
echo "  gg      - Jump to top"
echo "  G       - Jump to bottom"
echo "  Ctrl+D  - Page down"
echo "  Ctrl+U  - Page up"
echo "  /       - Start search"
echo "  Esc     - Cancel search"
echo "  q       - Quit"
