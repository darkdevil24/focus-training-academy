#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Focus Training Academy development environment...');

function runCommand(command, description) {
  console.log(`\n📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function checkPrerequisites() {
  console.log('\n🔍 Checking prerequisites...');
  
  try {
    execSync('node --version', { stdio: 'ignore' });
    console.log('✅ Node.js is installed');
  } catch {
    console.error('❌ Node.js is not installed. Please install Node.js 18+ first.');
    process.exit(1);
  }

  try {
    execSync('docker --version', { stdio: 'ignore' });
    console.log('✅ Docker is installed');
  } catch {
    console.error('❌ Docker is not installed. Please install Docker first.');
    process.exit(1);
  }

  try {
    execSync('docker-compose --version', { stdio: 'ignore' });
    console.log('✅ Docker Compose is installed');
  } catch {
    console.error('❌ Docker Compose is not installed. Please install Docker Compose first.');
    process.exit(1);
  }
}

function setupEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('\n📝 Creating .env file from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created. Please edit it with your configuration.');
  }
}

async function main() {
  checkPrerequisites();
  
  runCommand('npm install', 'Installing dependencies');
  
  setupEnvironment();
  
  runCommand('npm run format', 'Formatting code');
  
  console.log('\n🎉 Setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Edit .env file with your configuration');
  console.log('2. Run "node scripts/setup-https.js" to set up HTTPS certificates');
  console.log('3. Run "npm run docker:up" to start the database services');
  console.log('4. Run "npm run dev:https" to start the development servers');
  console.log('\nFor more information, see README.md');
}

main().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});