#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Focus Training Academy - Complete Development Setup\n');

// Check if running on Windows
const isWindows = process.platform === 'win32';

function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.log(`❌ ${description} failed:`, error.message);
    console.log(`   You may need to run this manually: ${command}\n`);
  }
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');
  
  const requirements = [
    { command: 'node --version', name: 'Node.js', min: '18.0.0' },
    { command: 'npm --version', name: 'npm', min: '9.0.0' },
    { command: 'git --version', name: 'Git', min: '2.0.0' }
  ];

  let allGood = true;

  requirements.forEach(req => {
    try {
      const version = execSync(req.command, { encoding: 'utf8' }).trim();
      console.log(`✅ ${req.name}: ${version}`);
    } catch (error) {
      console.log(`❌ ${req.name}: Not installed or not in PATH`);
      allGood = false;
    }
  });

  if (!allGood) {
    console.log('\n❌ Please install missing prerequisites before continuing.');
    process.exit(1);
  }

  console.log('\n✅ All prerequisites satisfied!\n');
}

function setupHTTPS() {
  console.log('🔒 Setting up HTTPS for development...\n');
  
  if (isWindows) {
    console.log('📋 Windows HTTPS Setup:');
    console.log('1. Install Chocolatey (if not installed):');
    console.log('   Run PowerShell as Administrator and execute:');
    console.log('   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://community.chocolatey.org/install.ps1\'))');
    console.log('\n2. Install mkcert:');
    console.log('   choco install mkcert');
    console.log('\n3. Setup local CA:');
    console.log('   mkcert -install');
    console.log('\n4. Generate certificates:');
    console.log('   mkcert localhost 127.0.0.1 ::1');
    console.log('\n⚠️  Please run these commands manually in PowerShell as Administrator\n');
  } else {
    // Try to install mkcert on macOS/Linux
    try {
      if (process.platform === 'darwin') {
        runCommand('brew install mkcert', 'Installing mkcert via Homebrew');
      } else {
        console.log('📋 Please install mkcert manually for your Linux distribution');
        console.log('   See: https://github.com/FiloSottile/mkcert#installation\n');
      }
      
      runCommand('mkcert -install', 'Setting up local CA');
      runCommand('mkcert localhost 127.0.0.1 ::1', 'Generating certificates');
    } catch (error) {
      console.log('⚠️  HTTPS setup failed. You may need to set this up manually.');
      console.log('   See: https://github.com/FiloSottile/mkcert#installation\n');
    }
  }
}

function setupDatabase() {
  console.log('🗄️  Setting up database services...\n');
  
  // Check if Docker is available
  try {
    execSync('docker --version', { stdio: 'ignore' });
    console.log('✅ Docker detected');
    
    // Check if docker-compose is available
    try {
      execSync('docker-compose --version', { stdio: 'ignore' });
      runCommand('docker-compose up -d postgres redis', 'Starting PostgreSQL and Redis with Docker');
    } catch (error) {
      try {
        execSync('docker compose --version', { stdio: 'ignore' });
        runCommand('docker compose up -d postgres redis', 'Starting PostgreSQL and Redis with Docker Compose V2');
      } catch (error) {
        console.log('❌ Docker Compose not found. Please install Docker Desktop or docker-compose');
      }
    }
  } catch (error) {
    console.log('❌ Docker not found. Please install Docker Desktop or set up PostgreSQL and Redis manually');
    console.log('   PostgreSQL: https://www.postgresql.org/download/');
    console.log('   Redis: https://redis.io/download/\n');
  }
}

function setupEnvironment() {
  console.log('⚙️  Setting up environment configuration...\n');
  
  // Run OAuth setup script
  try {
    runCommand('node scripts/setup-oauth-dev.js', 'Setting up OAuth development environment');
  } catch (error) {
    console.log('⚠️  OAuth setup script failed. Please run manually: node scripts/setup-oauth-dev.js\n');
  }
}

function installDependencies() {
  console.log('📦 Installing dependencies...\n');
  
  runCommand('npm install', 'Installing root dependencies');
  
  // Install auth service dependencies
  const authServicePath = path.join(process.cwd(), 'packages', 'auth-service');
  if (fs.existsSync(authServicePath)) {
    process.chdir(authServicePath);
    runCommand('npm install', 'Installing auth service dependencies');
    process.chdir(path.join('..', '..'));
  }
}

function runMigrations() {
  console.log('🔄 Running database migrations...\n');
  
  // Wait a moment for database to be ready
  console.log('⏳ Waiting for database to be ready...');
  setTimeout(() => {
    try {
      const authServicePath = path.join(process.cwd(), 'packages', 'auth-service');
      process.chdir(authServicePath);
      runCommand('npm run migrate', 'Running database migrations');
      process.chdir(path.join('..', '..'));
    } catch (error) {
      console.log('⚠️  Migration failed. Database may not be ready yet.');
      console.log('   Try running manually later: cd packages/auth-service && npm run migrate\n');
    }
  }, 5000);
}

function printNextSteps() {
  console.log('🎉 Development setup completed!\n');
  
  console.log('📋 Next Steps:');
  console.log('1. Set up Google OAuth credentials:');
  console.log('   - Go to https://console.cloud.google.com/');
  console.log('   - Follow the guide: docs/google-oauth-complete-setup.md');
  console.log('   - Update packages/auth-service/.env with your credentials\n');
  
  console.log('2. Start the development servers:');
  console.log('   cd packages/auth-service');
  console.log('   npm run dev\n');
  
  console.log('3. Test OAuth integration:');
  console.log('   - Visit: https://localhost:3001/auth/google');
  console.log('   - Should redirect to Google for authentication\n');
  
  console.log('🔗 Useful Links:');
  console.log('   - Repository: https://github.com/darkdevil24/focus-training-academy');
  console.log('   - OAuth Setup Guide: docs/google-oauth-complete-setup.md');
  console.log('   - Auth Service README: packages/auth-service/README.md\n');
  
  console.log('🆘 Need Help?');
  console.log('   - Check the documentation in the docs/ folder');
  console.log('   - Review the setup guides for each service');
  console.log('   - Ensure all environment variables are configured\n');
}

// Main execution
async function main() {
  try {
    checkPrerequisites();
    setupHTTPS();
    setupDatabase();
    setupEnvironment();
    installDependencies();
    
    // Run migrations after a delay to let database start
    setTimeout(() => {
      runMigrations();
      printNextSteps();
    }, 3000);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();