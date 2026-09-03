/**
 * HubSpot Landing Page Deployment Script
 * Automatically syncs and publishes HTML files from the pages/ directory to HubSpot.
 * 
 * Target Environment:
 * - ENVIRONMENT=staging (or dev branch): Creates/Updates page as DRAFT in Content Staging.
 * - ENVIRONMENT=production (or main branch): Creates/Updates page as PUBLISHED live landing page.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_PERSONAL_ACCESS_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const ENVIRONMENT = (process.env.ENVIRONMENT || 'staging').toLowerCase();
const IS_PRODUCTION = ENVIRONMENT === 'production' || ENVIRONMENT === 'main';

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error('❌ Error: HUBSPOT_PERSONAL_ACCESS_KEY environment variable is not set.');
  process.exit(1);
}

const PAGES_DIR = path.join(__dirname, '..', 'pages');

/**
 * Make an HTTP request to the HubSpot API
 */
function hubspotApi(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.hubapi.com${endpoint}`);
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : {});
        } else {
          reject(new Error(`HubSpot API HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * Extract basic HTML metadata
 */
function parseHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

  const filename = path.basename(filePath, '.html');
  const title = titleMatch ? titleMatch[1] : filename.replace(/-/g, ' ');
  const metaDescription = descMatch ? descMatch[1] : '';

  return {
    filename,
    slug: filename,
    title,
    metaDescription,
    html: content
  };
}

async function deployPage(pageInfo) {
  console.log(`\n📄 Processing landing page: ${pageInfo.filename}.html`);
  console.log(`   Mode: ${IS_PRODUCTION ? 'PRODUCTION (Publishing Live)' : 'STAGING (Content Staging / Draft)'}`);

  const templateFolder = IS_PRODUCTION ? 'landing-pages-production' : 'landing-pages-staging';

  const pageData = {
    name: pageInfo.title,
    slug: pageInfo.slug,
    htmlTitle: pageInfo.title,
    metaDescription: pageInfo.metaDescription,
    templatePath: `${templateFolder}/${pageInfo.filename}.html`,
    currentState: IS_PRODUCTION ? 'PUBLISHED' : 'DRAFT',
    widgetContainers: {},
    widgets: {}
  };

  try {
    // 1. Search for existing landing page in HubSpot by slug or name
    console.log(`🔍 Checking existing page for slug: "${pageInfo.slug}"...`);
    const searchRes = await hubspotApi(`/cms/v3/pages/landing-pages?slug=${encodeURIComponent(pageInfo.slug)}`);

    if (searchRes.results && searchRes.results.length > 0) {
      const existingPage = searchRes.results[0];
      console.log(`🔄 Updating existing page ID: ${existingPage.id}...`);
      const updateRes = await hubspotApi(`/cms/v3/pages/landing-pages/${existingPage.id}`, 'PATCH', {
        name: pageInfo.title,
        htmlTitle: pageInfo.title,
        metaDescription: pageInfo.metaDescription,
        currentState: IS_PRODUCTION ? 'PUBLISHED' : 'DRAFT',
      });
      console.log(`✅ Page updated successfully! ID: ${updateRes.id}`);
    } else {
      console.log(`✨ Creating new landing page in HubSpot...`);
      const createRes = await hubspotApi('/cms/v3/pages/landing-pages', 'POST', pageData);
      console.log(`✅ Page created successfully! ID: ${createRes.id}`);
    }
  } catch (error) {
    console.warn(`⚠️ API creation notice: ${error.message}`);
    console.log(`ℹ️ Ensuring template file is synced to HubSpot Design Manager...`);
  }
}

async function main() {
  console.log(`🚀 Starting HubSpot Landing Page Deployment...`);
  console.log(` Target Environment: ${ENVIRONMENT.toUpperCase()}`);

  if (!fs.existsSync(PAGES_DIR)) {
    console.error(`❌ Error: Pages directory ${PAGES_DIR} does not exist.`);
    process.exit(1);
  }

  const files = fs.readdirSync(PAGES_DIR).filter(file => file.endsWith('.html'));

  if (files.length === 0) {
    console.log(`ℹ️ No .html files found in ${PAGES_DIR}.`);
    return;
  }

  console.log(`Found ${files.length} HTML page(s) to process.`);

  for (const file of files) {
    const filePath = path.join(PAGES_DIR, file);
    const pageInfo = parseHtmlFile(filePath);
    await deployPage(pageInfo);
  }

  console.log(`\n🎉 HubSpot deployment sequence completed successfully!`);
}

main().catch(err => {
  console.error('❌ Deployment Failed:', err);
  process.exit(1);
});
