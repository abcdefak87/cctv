const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const networkErrors = [];

  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      errors.push({ type: 'console.error', message: text, url: page.url() });
      console.log(`❌ [CONSOLE ERROR] ${text}`);
    } else if (type === 'warning') {
      warnings.push({ type: 'console.warn', message: text, url: page.url() });
      console.log(`⚠️  [CONSOLE WARN] ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push({ type: 'page.error', message: error.message, stack: error.stack, url: page.url() });
    console.log(`💥 [PAGE ERROR] ${error.message}`);
  });

  // Capture network failures
  page.on('requestfailed', request => {
    const failure = request.failure();
    networkErrors.push({ 
      type: 'network.failed', 
      url: request.url(), 
      method: request.method(),
      error: failure ? failure.errorText : 'Unknown error'
    });
    console.log(`🌐 [NETWORK FAILED] ${request.method()} ${request.url()} - ${failure ? failure.errorText : 'Unknown'}`);
  });

  // Capture failed responses (4xx, 5xx)
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        type: 'network.error',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      console.log(`🔴 [HTTP ${response.status()}] ${response.url()}`);
    }
  });

  console.log('\n🚀 Starting application analysis...\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Test 1: Homepage
    console.log('📄 Testing: Homepage (http://localhost:8090)');
    await page.goto('http://localhost:8090', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('✅ Homepage loaded\n');

    // Test 2: Admin login page
    console.log('📄 Testing: Admin Login (/admin/login)');
    await page.goto('http://localhost:8090/admin/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✅ Admin login page loaded\n');

    // Test 3: Try to login with default credentials
    console.log('🔐 Testing: Admin Login Flow');
    const usernameInput = await page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = await page.locator('input[name="password"], input[type="password"]').first();
    const loginButton = await page.locator('button[type="submit"]').first();

    if (await usernameInput.count() > 0) {
      await usernameInput.fill('admin');
      await passwordInput.fill('admin123');
      await loginButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Login attempted\n');

      // Test 4: Admin dashboard
      console.log('📄 Testing: Admin Dashboard');
      await page.waitForTimeout(2000);
      console.log('✅ Dashboard loaded\n');

      // Test 5: Navigate to cameras page
      console.log('📄 Testing: Cameras Management');
      await page.goto('http://localhost:8090/admin/cameras', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      console.log('✅ Cameras page loaded\n');

      // Test 6: Navigate to areas page
      console.log('📄 Testing: Areas Management');
      await page.goto('http://localhost:8090/admin/areas', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      console.log('✅ Areas page loaded\n');

      // Test 7: Navigate to users page
      console.log('📄 Testing: Users Management');
      await page.goto('http://localhost:8090/admin/users', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      console.log('✅ Users page loaded\n');

      // Test 8: Navigate to settings page
      console.log('📄 Testing: Settings');
      await page.goto('http://localhost:8090/admin/settings', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      console.log('✅ Settings page loaded\n');
    }

    // Test 9: Public camera view
    console.log('📄 Testing: Public Camera View');
    await page.goto('http://localhost:8090/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('✅ Public view loaded\n');

  } catch (error) {
    console.log(`\n❌ Navigation Error: ${error.message}\n`);
    errors.push({ type: 'test.error', message: error.message, stack: error.stack });
  }

  await browser.close();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 ANALYSIS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`❌ Console Errors: ${errors.filter(e => e.type === 'console.error').length}`);
  console.log(`💥 Page Errors: ${errors.filter(e => e.type === 'page.error').length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`🌐 Network Errors: ${networkErrors.length}`);
  console.log(`\n📝 Total Issues Found: ${errors.length + warnings.length + networkErrors.length}\n`);

  if (errors.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ DETAILED ERRORS');
    console.log('═══════════════════════════════════════════════════════════\n');
    errors.forEach((err, idx) => {
      console.log(`${idx + 1}. [${err.type}] ${err.url || ''}`);
      console.log(`   ${err.message}`);
      if (err.stack) {
        console.log(`   Stack: ${err.stack.split('\n')[0]}`);
      }
      console.log('');
    });
  }

  if (networkErrors.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🌐 NETWORK ERRORS');
    console.log('═══════════════════════════════════════════════════════════\n');
    networkErrors.forEach((err, idx) => {
      console.log(`${idx + 1}. [${err.type}] ${err.method || 'GET'} ${err.url}`);
      console.log(`   Status: ${err.status || 'N/A'} - ${err.error || err.statusText || 'Unknown'}`);
      console.log('');
    });
  }

  // Save to file
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      consoleErrors: errors.filter(e => e.type === 'console.error').length,
      pageErrors: errors.filter(e => e.type === 'page.error').length,
      warnings: warnings.length,
      networkErrors: networkErrors.length,
      total: errors.length + warnings.length + networkErrors.length
    },
    errors,
    warnings,
    networkErrors
  };

  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  console.log('💾 Full report saved to: test-report.json\n');

  process.exit(errors.length > 0 || networkErrors.length > 0 ? 1 : 0);
})();
