#!/bin/bash

set -e  # Exit on error

echo "🚀 Building AI Commit Assistant CLI..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/cli dist/*.tgz

# Create dist directory
mkdir -p dist/cli

# Build TypeScript to JavaScript using dedicated CLI config
echo "⚙️  Compiling TypeScript..."
./node_modules/.bin/tsc --project tsconfig.cli.json

# Add shebang to the main CLI file if not present
if ! head -1 dist/cli/cli/index.js | grep -q '^#!/'; then
  echo "#!/usr/bin/env node" | cat - dist/cli/cli/index.js > dist/cli/cli/index.js.tmp
  mv dist/cli/cli/index.js.tmp dist/cli/cli/index.js
fi

# Make the CLI file executable
chmod +x dist/cli/cli/index.js

# Copy the CLI package.json to dist
echo "📦 Preparing package..."
cp cli-package.json dist/cli/package.json

# Copy README for npm
echo "📄 Copying README..."
cp CLI-README.md dist/cli/README.md

# Copy required lib files if not already in dist
if [ ! -f "dist/cli/lib/ai-assistant.js" ]; then
  echo "⚠️  Warning: lib files not found in expected location"
fi

# Create package tarball
echo "📦 Creating package tarball..."
cd dist/cli
npm pack

# Move tarball to dist root
mv *.tgz ../

cd ../..

echo ""
echo "✅ CLI build complete!"
echo "📦 Package created: ./dist/ai-commit-assistant-1.0.0.tgz"
echo ""
echo "🌍 To install globally: needs admin access"
echo "   npm install -g ./dist/ai-commit-assistant-1.0.0.tgz"
echo ""
echo "💡 Or use the convenience script:"
echo "   npm run ai-commit:global"
echo ""
echo "⚠️  Note: If you get a git error, make sure to use the exact filename"
echo "   (not wildcards like *.tgz)"