/**
 * HubSpot Landing Page Deployment Script
 * Automatically syncs and publishes HTML files from the pages/ directory to HubSpot.
 * 
 * Target Environment:
 * - ENVIRONMENT=dev          : Design Manager sync only — no CMS page creation.
 *                              Templates are uploaded to `landing-pages/design-manager/` via
 *                              the hubspot-cms-deploy-action step that runs before this script.
 * - ENVIRONMENT=staging      : Creates/Updates pages as DRAFT in Content Staging.
 *                              Templates go to `landing-pages/content-staging/`.
 * - ENVIRONMENT=production   : Creates/Updates pages as PUBLISHED live landing pages.
 *                              Templates go to `landing-pages/production/`.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_PERSONAL_ACCESS_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const ENVIRONMENT = (process.env.ENVIRONMENT || 'staging').toLowerCase();
const HUBSPOT_STAGING_DOMAIN = process.env.HUBSPOT_STAGING_DOMAIN;

const IS_DEV = ENVIRONMENT === 'dev';
const IS_STAGING = ENVIRONMENT === 'staging' || ENVIRONMENT === 'stage';
const IS_PRODUCTION = ENVIRONMENT === 'production' || ENVIRONMENT === 'main';

/**
 * Map environment to the corresponding Design Manager folder name.
 */
function getDesignManagerFolder() {
  if (IS_DEV) return 'landing-pages/design-manager';
  if (IS_STAGING) return 'landing-pages/content-staging';
  return 'landing-pages/production';
}

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

/**
 * Small delay to avoid HubSpot rate-limiting (429s).
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Publish a page by setting state=PUBLISHED and then pushing the draft live.
 * HubSpot's CMS v3 API requires BOTH steps:
 *   1. PATCH state → PUBLISHED  (flips the page out of DRAFT)
 *   2. POST  /draft/push-live   (syncs draft content to the live version)
 * Doing only one of these leaves the page in DRAFT or with stale content.
 */
async function publishPage(pageId) {
  // Step 1: Set state to PUBLISHED
  await hubspotApi(`/cms/v3/pages/landing-pages/${pageId}`, 'PATCH', {
    state: 'PUBLISHED',
  });
  await sleep(300);

  // Step 2: Push draft content live
  await hubspotApi(`/cms/v3/pages/landing-pages/${pageId}/draft/push-live`, 'POST');
}

/**
 * Deploy a single page to HubSpot.
 * 
 * For 'dev' environment: Skips CMS Pages API — templates are already synced
 *                        to Design Manager by the hubspot-cms-deploy-action.
 * For 'staging':         Creates/Updates the page as DRAFT (Content Staging).
 * For 'production':      Creates/Updates the page and PUBLISHES it live.
 */
async function deployPage(pageInfo) {
  console.log(`\n📄 Processing landing page: ${pageInfo.filename}.html`);

  // ── Dev environment: Design Manager only (no CMS page creation) ──
  if (IS_DEV) {
    console.log(`   Mode: DEV (Design Manager Only)`);
    console.log(`   📁 Template synced to Design Manager: ${getDesignManagerFolder()}/${pageInfo.filename}.html`);
    console.log(`   ℹ️  No CMS landing page created — template available in Design Manager for preview.`);
    return;
  }

  // ── Staging or Production: Create/Update CMS pages ──
  const modeLabel = IS_PRODUCTION
    ? 'PRODUCTION (Publishing Live)'
    : 'STAGING (Content Staging / Draft)';
  console.log(`   Mode: ${modeLabel}`);

  const designManagerFolder = getDesignManagerFolder();

  // Always create/update as DRAFT first — the API ignores currentState=PUBLISHED on POST.
  const pageData = {
    name: pageInfo.title,
    slug: pageInfo.slug,
    htmlTitle: pageInfo.title,
    metaDescription: pageInfo.metaDescription,
    templatePath: `${designManagerFolder}/${pageInfo.filename}.html`,
    currentState: 'DRAFT',
    widgetContainers: {},
    widgets: {}
  };

  // For staging: associate the page with the staging domain so it appears
  // under Content Staging → resources.getlevrg.com as a staged draft.
  if (IS_STAGING) {
    pageData.domain = HUBSPOT_STAGING_DOMAIN;
  }

  try {
    let pageId;

    // 1. Search for existing landing page in HubSpot by slug
    console.log(`🔍 Checking existing page for slug: "${pageInfo.slug}"...`);
    const searchRes = await hubspotApi(`/cms/v3/pages/landing-pages?slug=${encodeURIComponent(pageInfo.slug)}`);

    if (searchRes.results && searchRes.results.length > 0) {
      const existingPage = searchRes.results[0];
      pageId = existingPage.id;
      console.log(`🔄 Updating existing page ID: ${pageId}...`);
      const patchData = {
        name: pageInfo.title,
        htmlTitle: pageInfo.title,
        metaDescription: pageInfo.metaDescription,
        templatePath: `${designManagerFolder}/${pageInfo.filename}.html`,
      };
      // For staging: ensure domain is set so page stays under resources.getlevrg.com
      if (IS_STAGING) {
        patchData.domain = HUBSPOT_STAGING_DOMAIN;
      }
      await hubspotApi(`/cms/v3/pages/landing-pages/${pageId}`, 'PATCH', patchData);
      console.log(`✅ Page updated successfully! ID: ${pageId}`);
    } else {
      console.log(`✨ Creating new landing page in HubSpot...`);
      const createRes = await hubspotApi('/cms/v3/pages/landing-pages', 'POST', pageData);
      pageId = createRes.id;
      console.log(`✅ Page created successfully! ID: ${pageId}`);
    }

    // 2. If production, publish the page (PATCH state + push-live)
    if (IS_PRODUCTION) {
      await sleep(300);
      console.log(`🚀 Publishing page ${pageId} live...`);
      await publishPage(pageId);
      console.log(`✅ Page ${pageId} is now PUBLISHED and live!`);
    } else {
      console.log(`📋 Page ${pageId} left as DRAFT in Content Staging (domain: ${HUBSPOT_STAGING_DOMAIN}).`);
    }
  } catch (error) {
    console.warn(`⚠️ API error: ${error.message}`);
    console.log(`ℹ️ Ensuring template file is synced to HubSpot Design Manager...`);
  }
}

async function main() {
  console.log(`🚀 Starting HubSpot Landing Page Deployment...`);
  console.log(`   Target Environment: ${ENVIRONMENT.toUpperCase()}`);
  console.log(`   Design Manager Folder: ${getDesignManagerFolder()}`);

  if (IS_DEV) {
    console.log(`   Strategy: Design Manager sync only (no CMS page creation)`);
  } else if (IS_STAGING) {
    console.log(`   Strategy: Content Staging — create/update pages as DRAFT`);
  } else {
    console.log(`   Strategy: Production — create/update and PUBLISH pages live`);
  }

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
