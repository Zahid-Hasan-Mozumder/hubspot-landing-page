# HubSpot Landing Pages Automated Deployment Requirements

## Overview
This repository manages HTML landing pages and automatically deploys them to **HubSpot** using GitHub Actions CI/CD workflows. 

The system operates across two branches:
- **`dev` Branch**: Automatically deploys new/updated HTML landing pages to the **HubSpot Content Staging** (or Staging/Draft) section for QA, preview, and marketing review.
- **`main` Branch**: Automatically deploys new/updated HTML landing pages directly to **Live / Production HubSpot Landing Pages**.

---

## 1. Directory Structure Requirements

All HTML landing pages must be stored in the designated `pages/` directory:

```text
hubspot-landing-pages/
├── .github/
│   └── workflows/
│       └── push-to-hubspot.yml       # GitHub Actions workflow for deployment
├── pages/                             # Folder containing all HTML landing pages
│   ├── README.md                      # Guidelines for writing HTML pages for HubSpot
│   ├── sample-landing-page.html       # Example landing page
│   └── ...                            # Additional HTML landing pages
├── scripts/
│   └── deploy-hubspot.js              # Deployment handler script (CLI / API runner)
├── package.json                       # Node.js dependencies (@hubspot/cli, API helpers)
├── REQUIREMENTS.md                    # Project requirements (this file)
└── .gitignore                         # Git ignore file
```

### File Naming Rules
- HTML files inside `pages/` should use lower-kebab-case (e.g., `product-launch.html`, `webinar-registration.html`).
- Each `.html` file represents an individual landing page to be created/updated in HubSpot.

---

## 2. Branching & Deployment Strategy

| Branch | Destination Environment | HubSpot Page Status / Location | Trigger |
| :--- | :--- | :--- | :--- |
| **`dev`** | **Staging Environment** | Content Staging (`DRAFT` / `Staging` folder) | Push to `dev` or PR merge into `dev` |
| **`main`** | **Production Environment** | Published Landing Pages (`PUBLISHED` / `Live`) | Push to `main` or PR merge into `main` |

### Branch Workflow Mechanics
1. **Developer workflow for new page / update**:
   - Create a feature branch off `dev`.
   - Add or edit an HTML file in `pages/` (e.g., `pages/summer-promo.html`).
   - Push to `dev`.
   - **GitHub Action triggers**: Deploys the HTML file to **HubSpot Design Manager** (`landing-pages-staging/` folder) and registers it in **Content Staging** as a draft template/page.
   - Review and test in HubSpot Content Staging.
2. **Promoting to Live / Production**:
   - Create a Pull Request from `dev` to `main`.
   - Upon merging into `main`, **GitHub Action triggers**: Deploys the HTML template to **Design Manager** (`landing-pages-production/` folder) and publishes the landing page live.

---

## 2.1. HubSpot CMS Architecture: Design Manager vs. Content Staging

### Why Files Go to Design Manager First
In HubSpot's CMS architecture:
- **Design Manager** (`/design-manager/...`): The **Code & Template Store** where developers manage source code, HTML templates, CSS, JS, and modules.
- **Content Staging** (`/content/.../staging/...`): The **Marketer & Content Editor Workspace** where non-technical users pick templates from Design Manager, fill in copy, preview on test domains, and stage pages for publish.

### Is This Workflow Better?
**Yes, absolutely.** Automated code deployment into **Design Manager** is the standard, best-practice workflow recommended by HubSpot because:
1. **Code Safety**: Keeps code version-controlled in GitHub and uploaded safely to Design Manager without risking content deletion in HubSpot.
2. **Role Separation**: Developers write markup in GitHub -> Design Manager; Marketers create and preview pages in Content Staging based on those templates.
3. **Instant Preview**: Any code change pushed to `dev` updates the staging template in Design Manager, which immediately reflects in Content Staging.

---

## 3. GitHub Secrets Configuration

To authenticate with HubSpot, configure the following secrets in your GitHub Repository under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example / Required For |
| :--- | :--- | :--- |
| `HUBSPOT_PERSONAL_ACCESS_KEY` | HubSpot Personal Access Key (or Private App Token) with permissions for CMS / Content / Files API. | Required for both Staging & Production deployment. |
| `HUBSPOT_ACCOUNT_ID` | Your HubSpot Portal / Account ID. | Required for HubSpot CLI authentication. |
| `HUBSPOT_PORTAL_ID_STAGING` *(Optional)* | Separate HubSpot Staging Portal ID if using a dedicated sandbox portal. | Staging environment override. |
| `HUBSPOT_ACCESS_KEY_STAGING` *(Optional)* | Separate Private App Token for Staging Sandbox portal. | Staging environment override. |

### Required HubSpot Private App Scopes
Ensure your HubSpot Personal Access Key / Private App has the following scopes enabled:
- `content` (Read & Write CMS Content, Landing Pages)
- `files` (Read & Write File Manager assets if external CSS/JS/Images are uploaded)
- `cms.functions.read` / `cms.functions.write` (If HubL / CMS functions are used)

---

## 4. Technical Requirements & Tooling

1. **GitHub Actions Runner**: `ubuntu-latest` with `Node.js 18+` or `20+`.
2. **HubSpot CLI (`@hubspot/cli`)**: Used to sync HTML templates, modules, and assets directly to HubSpot's Design Manager / File Manager.
3. **HubSpot CMS Pages API (`/cms/v3/pages/landing-pages`)**: Used by the deployment script to create/publish landing page instances in Content Staging (`dev`) or Live (`main`).

---

## 5. Verification & Testing

- **Dev Branch Deployment Verification**:
  1. Push a test page `pages/test-dev-page.html` to `dev`.
  2. Confirm GitHub Action `Push to HubSpot` passes.
  3. Log into HubSpot > **Marketing** > **Website** > **Landing Pages** > **Content Staging**.
  4. Verify the page appears under draft / staged pages.

- **Main Branch Deployment Verification**:
  1. Merge `dev` into `main`.
  2. Confirm GitHub Action `Push to HubSpot` passes.
  3. Log into HubSpot > **Marketing** > **Website** > **Landing Pages**.
  4. Verify the page is listed as published and live.
