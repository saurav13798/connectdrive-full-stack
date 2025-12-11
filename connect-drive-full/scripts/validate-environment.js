#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * This script validates that the development environment is properly configured
 * according to the ConnectDrive Complete Redesign specifications.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(type, message) {
    const timestamp = new Date().toISOString();
    const prefix = {
      error: '❌',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (type === 'error') this.errors.push(message);
    if (type === 'warning') this.warnings.push(message);
    if (type === 'success') this.success.push(message);
  }

  checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.log('success', `${description}: ${filePath}`);
      return true;
    } else {
      this.log('error', `Missing ${description}: ${filePath}`);
      return false;
    }
  }

  checkPackageJson(packagePath, requiredDeps) {
    if (!this.checkFileExists(packagePath, 'package.json')) {
      return false;
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      let allPresent = true;
      for (const [dep, version] of Object.entries(requiredDeps)) {
        if (allDeps[dep]) {
          this.log('success', `Dependency ${dep}: ${allDeps[dep]}`);
        } else {
          this.log('error', `Missing dependency: ${dep}@${version}`);
          allPresent = false;
        }
      }
      
      return allPresent;
    } catch (error) {
      this.log('error', `Failed to parse ${packagePath}: ${error.message}`);
      return false;
    }
  }

  checkTypeScriptConfig(configPath, requiredOptions) {
    if (!this.checkFileExists(configPath, 'TypeScript config')) {
      return false;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const compilerOptions = config.compilerOptions || {};
      
      let allPresent = true;
      for (const [option, expectedValue] of Object.entries(requiredOptions)) {
        if (compilerOptions[option] === expectedValue) {
          this.log('success', `TypeScript option ${option}: ${compilerOptions[option]}`);
        } else {
          this.log('error', `TypeScript option ${option} should be ${expectedValue}, got ${compilerOptions[option]}`);
          allPresent = false;
        }
      }
      
      return allPresent;
    } catch (error) {
      this.log('error', `Failed to parse ${configPath}: ${error.message}`);
      return false;
    }
  }

  checkESLintConfig(configPath) {
    if (!this.checkFileExists(configPath, 'ESLint config')) {
      return false;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check for required rules
      const requiredRules = [
        '@typescript-eslint/no-explicit-any',
        '@typescript-eslint/no-unused-vars',
        '@typescript-eslint/explicit-function-return-type'
      ];
      
      let allPresent = true;
      for (const rule of requiredRules) {
        if (config.rules && config.rules[rule]) {
          this.log('success', `ESLint rule ${rule}: ${config.rules[rule]}`);
        } else {
          this.log('warning', `ESLint rule ${rule} not configured`);
        }
      }
      
      return allPresent;
    } catch (error) {
      this.log('error', `Failed to parse ${configPath}: ${error.message}`);
      return false;
    }
  }

  checkCommand(command, description) {
    try {
      execSync(command, { stdio: 'pipe' });
      this.log('success', `${description} is available`);
      return true;
    } catch (error) {
      this.log('error', `${description} is not available: ${command}`);
      return false;
    }
  }

  validateFrontend() {
    this.log('info', 'Validating Frontend Environment...');
    
    const frontendPath = path.join(__dirname, '../frontend');
    
    // Check package.json and dependencies
    this.checkPackageJson(path.join(frontendPath, 'package.json'), {
      'next': '^14.0.0',
      'react': '^18.0.0',
      'typescript': '^5.0.0',
      'fast-check': '^3.0.0',
      '@typescript-eslint/eslint-plugin': '^6.0.0',
      'prettier': '^3.0.0'
    });
    
    // Check TypeScript configuration
    this.checkTypeScriptConfig(path.join(frontendPath, 'tsconfig.json'), {
      'strict': true,
      'noImplicitAny': true,
      'noImplicitReturns': true,
      'noUnusedLocals': true,
      'noUnusedParameters': true,
      'exactOptionalPropertyTypes': true,
      'noUncheckedIndexedAccess': true
    });
    
    // Check ESLint configuration
    this.checkESLintConfig(path.join(frontendPath, '.eslintrc.json'));
    
    // Check required files
    this.checkFileExists(path.join(frontendPath, '.prettierrc'), 'Prettier config');
    this.checkFileExists(path.join(frontendPath, 'jest.property.config.js'), 'Property test config');
    this.checkFileExists(path.join(frontendPath, 'test/setup-property.ts'), 'Property test setup');
  }

  validateBackend() {
    this.log('info', 'Validating Backend Environment...');
    
    const backendPath = path.join(__dirname, '../backend');
    
    // Check package.json and dependencies
    this.checkPackageJson(path.join(backendPath, 'package.json'), {
      '@nestjs/core': '^10.0.0',
      'typescript': '^5.0.0',
      'fast-check': '^3.0.0',
      '@typescript-eslint/eslint-plugin': '^6.0.0',
      'prettier': '^3.0.0'
    });
    
    // Check TypeScript configuration
    this.checkTypeScriptConfig(path.join(backendPath, 'tsconfig.json'), {
      'strict': true,
      'noImplicitAny': true,
      'noImplicitReturns': true,
      'noUnusedLocals': true,
      'noUnusedParameters': true,
      'exactOptionalPropertyTypes': true
    });
    
    // Check ESLint configuration
    this.checkESLintConfig(path.join(backendPath, '.eslintrc.json'));
    
    // Check required files
    this.checkFileExists(path.join(backendPath, '.prettierrc'), 'Prettier config');
    this.checkFileExists(path.join(backendPath, 'jest.property.config.js'), 'Property test config');
    this.checkFileExists(path.join(backendPath, 'test/setup-property.ts'), 'Property test setup');
  }

  validateCommands() {
    this.log('info', 'Validating Available Commands...');
    
    // Check Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      
      if (majorVersion >= 18) {
        this.log('success', `Node.js version: ${nodeVersion}`);
      } else {
        this.log('error', `Node.js version ${nodeVersion} is too old. Requires >= 18.0.0`);
      }
    } catch (error) {
      this.log('error', 'Node.js is not available');
    }
    
    // Check npm
    this.checkCommand('npm --version', 'npm');
    
    // Check TypeScript compiler
    this.checkCommand('npx tsc --version', 'TypeScript compiler');
    
    // Check ESLint
    this.checkCommand('npx eslint --version', 'ESLint');
    
    // Check Prettier
    this.checkCommand('npx prettier --version', 'Prettier');
  }

  validatePropertyTestSetup() {
    this.log('info', 'Validating Property-Based Testing Setup...');
    
    // Check if fast-check is properly configured
    const frontendSetup = path.join(__dirname, '../frontend/test/setup-property.ts');
    const backendSetup = path.join(__dirname, '../backend/test/setup-property.ts');
    
    if (this.checkFileExists(frontendSetup, 'Frontend property test setup')) {
      try {
        const content = fs.readFileSync(frontendSetup, 'utf8');
        if (content.includes('numRuns: 100')) {
          this.log('success', 'Frontend property tests configured for 100 iterations');
        } else {
          this.log('warning', 'Frontend property tests may not be configured for required 100 iterations');
        }
      } catch (error) {
        this.log('error', `Failed to validate frontend property test setup: ${error.message}`);
      }
    }
    
    if (this.checkFileExists(backendSetup, 'Backend property test setup')) {
      try {
        const content = fs.readFileSync(backendSetup, 'utf8');
        if (content.includes('numRuns: 100')) {
          this.log('success', 'Backend property tests configured for 100 iterations');
        } else {
          this.log('warning', 'Backend property tests may not be configured for required 100 iterations');
        }
      } catch (error) {
        this.log('error', `Failed to validate backend property test setup: ${error.message}`);
      }
    }
  }

  run() {
    this.log('info', 'Starting ConnectDrive Environment Validation...');
    this.log('info', '================================================');
    
    this.validateCommands();
    this.validateFrontend();
    this.validateBackend();
    this.validatePropertyTestSetup();
    
    this.log('info', '================================================');
    this.log('info', 'Environment Validation Complete');
    
    console.log('\n📊 Summary:');
    console.log(`✅ Success: ${this.success.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Critical Issues Found:');
      this.errors.forEach(error => console.log(`   • ${error}`));
      process.exit(1);
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    console.log('\n🎉 Environment validation passed!');
    process.exit(0);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.run();
}

module.exports = EnvironmentValidator;