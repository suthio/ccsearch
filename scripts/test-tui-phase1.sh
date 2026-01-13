#!/bin/bash

set -e

echo "🧪 Testing CCSearch TUI - Phase 1"
echo "=================================="
echo ""

# Test 1: Build
echo "📦 Test 1: Building TUI..."
npm run build:tui > /dev/null 2>&1
echo "✅ Build completed"
echo ""

# Test 2: Verify artifacts
echo "📁 Test 2: Checking build artifacts..."
if [ -f "dist/tui.mjs" ]; then
    SIZE=$(du -h dist/tui.mjs | cut -f1)
    echo "   ✅ dist/tui.mjs exists ($SIZE)"
else
    echo "   ❌ dist/tui.mjs missing"
    exit 1
fi

if [ -f "dist/tui-runner.mjs" ]; then
    SIZE=$(du -h dist/tui-runner.mjs | cut -f1)
    echo "   ✅ dist/tui-runner.mjs exists ($SIZE)"
else
    echo "   ❌ dist/tui-runner.mjs missing"
    exit 1
fi
echo ""

# Test 3: Validate JavaScript syntax
echo "🔍 Test 3: Validating bundle syntax..."
if node -c dist/tui.mjs 2>/dev/null; then
    echo "   ✅ Bundle has valid JavaScript syntax"
else
    echo "   ❌ Bundle has syntax errors"
    exit 1
fi
echo ""

# Test 4: Check exports
echo "📤 Test 4: Checking exports..."
if node -e "import('./dist/tui.mjs').then(m => { if (m.runTUI) { console.log('   ✅ runTUI export found'); process.exit(0); } else { console.log('   ❌ runTUI export missing'); process.exit(1); } })" 2>/dev/null; then
    :
else
    echo "   ❌ Export check failed"
    exit 1
fi
echo ""

# Summary
echo "=================================="
echo "✨ All Phase 1 tests passed!"
echo ""
echo "To manually test the interactive TUI, run:"
echo "  npm run tui"
echo ""
echo "Expected behavior:"
echo "  - Bordered interface appears"
echo "  - Shows 'CCSearch TUI' header"
echo "  - Shows 'Loading sessions...' message"
echo "  - Press 'q' to quit"
