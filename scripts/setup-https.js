#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Setting up HTTPS for local development...');

// Check if mkcert is installed
try {
  execSync('mkcert -version', { stdio: 'ignore' });
  console.log('✅ mkcert is already installed');
} catch (error) {
  console.log('❌ mkcert is not installed');
  console.log('Please install mkcert first:');
  console.log('');
  console.log('Windows (using Chocolatey):');
  console.log('  choco install mkcert');
  console.log('');
  console.log('Windows (using Scoop):');
  console.log('  scoop bucket add extras');
  console.log('  scoop install mkcert');
  console.log('');
  console.log('macOS (using Homebrew):');
  console.log('  brew install mkcert');
  console.log('');
  console.log('Linux:');
  console.log('  # Download from https://github.com/FiloSottile/mkcert/releases');
  console.log('');
  process.exit(1);
}

// Create certs directory
const certsDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

try {
  // Install local CA
  console.log('📋 Installing local CA...');
  execSync('mkcert -install', { stdio: 'inherit' });

  // Generate certificates
  console.log('🔑 Generating SSL certificates...');
  execSync(`mkcert -key-file ${certsDir}/localhost-key.pem -cert-file ${certsDir}/localhost.pem localhost 127.0.0.1 ::1`, {
    stdio: 'inherit',
    cwd: certsDir
  });

  console.log('✅ HTTPS setup complete!');
  console.log('');
  console.log('Certificates generated:');
  console.log(`  - ${certsDir}/localhost.pem`);
  console.log(`  - ${certsDir}/localhost-key.pem`);
  console.log('');
  console.log('You can now run the development server with HTTPS:');
  console.log('  npm run dev:https');

} catch (error) {
  console.error('❌ Failed to set up HTTPS:', error.message);
  process.exit(1);
}