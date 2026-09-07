# HubSpot Landing Pages Automated Deployment Requirements

## Overview
This repository manages HTML landing pages and automatically deploys them to **HubSpot** using GitHub Actions CI/CD workflows. 

The system operates across three branches:
- **`dev` Branch**: Syncs HTML templates to **HubSpot Design Manager** only (under `landing-pages/design-manager/`). No CMS landing page is created — templates are available for developer preview and inspection in Design Manager.
- **`stage` Branch**: Syncs HTML templates to Design Manager (under `landing-pages/content-staging/`) and creates/updates landing pages as **DRAFT** in **HubSpot Content Staging** for QA, preview, and marketing review.
- **`main` Branch**: Syncs HTML templates to Design Manager (under `landing-pages/production/`) and **publishes** landing pages live to **HubSpot Production**.

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

| Branch | Destination Environment | HubSpot Location | Design Manager Folder | Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **`dev`** | **Design Manager Only** | Templates in Design Manager (no CMS page) | `landing-pages/design-manager/` | Push to `dev` or PR merge into `dev` |
| **`stage`** | **Content Staging** | Content Staging (`DRAFT` pages) | `landing-pages/content-staging/` | Push to `stage` or PR merge into `stage` |
| **`main`** | **Production** | Published Landing Pages (`PUBLISHED` / `Live`) | `landing-pages/production/` | Push to `main` or PR merge into `main` |

### Branch Workflow Mechanics
1. **Developer workflow for new page / update**:
   - Create a feature branch off `dev`.
   - Add or edit an HTML file in `pages/` (e.g., `pages/summer-promo.html`).
   - Push to `dev`.
   - **GitHub Action triggers**: Syncs the HTML file to **HubSpot Design Manager** (`landing-pages/design-manager/` folder). No CMS page is created — the template is available for developer preview only.
   - Review and verify the template in HubSpot Design Manager (More Tools → Design Manager).

2. **Promoting to Content Staging for QA / Marketing Review**:
   - Merge `dev` into `stage` (or create a PR from `dev` to `stage`).
   - **GitHub Action triggers**: Syncs the HTML template to Design Manager (`landing-pages/content-staging/` folder) **and** creates/updates a DRAFT landing page in **Content Staging**.
   - Marketers can preview, edit content, and QA the page in Content Staging.

3. **Promoting to Live / Production**:
   - Merge `stage` into `main` (or create a PR from `stage` to `main`).
   - Upon merging into `main`, **GitHub Action triggers**: Syncs the HTML template to Design Manager (`landing-pages/production/` folder) **and** publishes the landing page live.

---

## 2.1. HubSpot CMS Architecture: Design Manager vs. Content Staging

### Why Files Go to Design Manager First
In HubSpot's CMS architecture:
- **Design Manager** (`/design-manager/...`): The **Code & Template Store** where developers manage source code, HTML templates, CSS, JS, and modules.
- **Content Staging** (`/content/.../staging/...`): The **Marketer & Content Editor Workspace** where non-technical users pick templates from Design Manager, fill in copy, preview on test domains, and stage pages for publish.

### Three-Branch Architecture Benefits
**This three-branch strategy provides granular control:**
1. **Dev → Design Manager Only**: Developers can iterate on templates without affecting content editors or live pages. Templates are uploaded safely to Design Manager for preview.
2. **Stage → Content Staging**: Once templates are ready, merging to `stage` creates/updates DRAFT pages that marketers can preview and QA before going live.
3. **Main → Published**: Final approval — merging to `main` publishes the page live with confidence that it has been reviewed at both the template and content level.

### Is This Workflow Better?
**Yes, absolutely.** This granular approach provides:
1. **Code Safety**: Keeps code version-controlled in GitHub and uploaded safely to Design Manager without risking content deletion in HubSpot.
2. **Role Separation**: Developers write markup in GitHub → Design Manager; Marketers create and preview pages in Content Staging based on those templates.
3. **Staged Rollout**: Changes progress through Design Manager → Content Staging → Published, reducing the risk of broken pages reaching production.
4. **Instant Preview**: Any code change pushed to `dev` updates the template in Design Manager, which can be used in Content Staging once promoted to `stage`.

---

## 3. GitHub Secrets Configuration

To authenticate with HubSpot, configure the following secrets in your GitHub Repository under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example / Required For |
| :--- | :--- | :--- |
| `HUBSPOT_PERSONAL_ACCESS_KEY` | HubSpot Personal Access Key (or Private App Token) with permissions for CMS / Content / Files API. | Required for all environments (dev, stage, production). |
| `HUBSPOT_ACCOUNT_ID` | Your HubSpot Portal / Account ID. | Required for HubSpot CLI authentication. |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot Private App Token for CMS Pages API operations. | Required for stage and production (page creation/publishing). |
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
3. **HubSpot CMS Pages API (`/cms/v3/pages/landing-pages`)**: Used by the deployment script to create/publish landing page instances in Content Staging (`stage`) or Live (`main`). Not used for `dev` branch (Design Manager sync only).

---

## 5. Verification & Testing

- **Dev Branch Deployment Verification**:
  1. Push a test page `pages/test-dev-page.html` to `dev`.
  2. Confirm GitHub Action `Sync to HubSpot Design Manager (dev)` passes.
  3. Log into HubSpot > **Marketing** > **Website** > **Landing Pages** > **More Tools** > **Design Manager**.
  4. Verify the template appears under `landing-pages/design-manager/` folder.

- **Stage Branch Deployment Verification**:
  1. Merge `dev` into `stage`.
  2. Confirm GitHub Action `Deploy to HubSpot Content Staging (stage)` passes.
  3. Log into HubSpot > **Marketing** > **Website** > **Landing Pages** > **Content Staging**.
  4. Verify the page appears under draft / staged pages.

- **Main Branch Deployment Verification**:
  1. Merge `stage` into `main`.
  2. Confirm GitHub Action `Deploy to HubSpot Live Landing Pages (main)` passes.
  3. Log into HubSpot > **Marketing** > **Website** > **Landing Pages**.
  4. Verify the page is listed as published and live.
