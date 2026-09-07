# 🚀 HubSpot Landing Pages Automated CI/CD

An automated pipeline for developing, staging, and publishing HTML landing pages directly to **HubSpot CMS** using GitHub Actions.

---

## 📌 Features

- **Automated Deployments**: Every push to `dev`, `stage`, or `main` automatically triggers a deployment to HubSpot.
- **Three-Branch Strategy**:
  - **`dev` Branch**: Syncs HTML templates to **HubSpot Design Manager** only — no CMS page creation. Templates are available for developer preview under `landing-pages/design-manager/`.
  - **`stage` Branch**: Syncs templates to Design Manager **and** creates/updates landing pages as **DRAFT** in **HubSpot Content Staging** for QA, preview, and marketing review.
  - **`main` Branch**: Syncs templates to Design Manager **and** publishes landing pages **live** to **HubSpot Production**.
- **Zero-Downtime Sync**: Syncs template assets directly with HubSpot Design Manager and updates page metadata seamlessly.

---

## 📂 Repository Structure

```text
hubspot-landing-page/
├── .github/
│   └── workflows/
│       └── push-to-hubspot.yml        # GitHub Actions workflow for dev, stage & main branches
├── pages/                              # Folder for all HTML landing pages
│   └── README.md                       # Guidelines for writing HTML pages for HubSpot
├── scripts/
│   └── deploy-hubspot.js               # Deployment script using HubSpot CLI & CMS API
├── REQUIREMENTS.md                     # Comprehensive technical requirements & specifications
├── package.json                        # Node.js project & dependency configuration
├── README.md                           # Main documentation (this file)
└── .gitignore                          # Git ignore rules
```

---

## 🚀 Quick Start

### 1. Adding a New Landing Page

1. Create a new `.html` file inside the `pages/` directory using lower-kebab-case:
   ```bash
   # Example
   pages/black-friday-sale.html
   ```
2. Add your HTML code (include standard `<head>`, `<title>`, `<meta name="description">`, and `<body>` tags).

### 2. Deployment Workflow

#### Design Manager Preview (`dev` Branch)
1. Push your changes to the `dev` branch or create a PR targeting `dev`:
   ```bash
   git checkout dev
   git add pages/black-friday-sale.html
   git commit -m "Add Black Friday landing page"
   git push origin dev
   ```
2. **GitHub Action triggers**: The HTML template is synced to **HubSpot Design Manager** under `landing-pages/design-manager/`.
3. Preview and verify the template directly in Design Manager (Marketing → Website → Landing Pages → More Tools → Design Manager).

#### Content Staging Deployment (`stage` Branch)
1. Merge your `dev` branch into `stage` (or push directly to `stage`):
   ```bash
   git checkout stage
   git merge dev
   git push origin stage
   ```
2. **GitHub Action triggers**: The template is synced to Design Manager **and** a **DRAFT** landing page is created/updated in **HubSpot Content Staging**.
3. Review and QA the page inside HubSpot Content Staging (Marketing → Website → Landing Pages → Content Staging).

#### Live Production Deployment (`main` Branch)
1. Merge your `stage` branch into `main` (or push directly to `main`):
   ```bash
   git checkout main
   git merge stage
   git push origin main
   ```
2. **GitHub Action triggers**: The landing page goes **Live / Published** on HubSpot!

---

## 🔑 GitHub Secrets Setup

To connect GitHub Actions with your HubSpot account, add the following secrets in your GitHub repository (**Settings > Secrets and variables > Actions**):

| Secret Name | Description |
| :--- | :--- |
| `HUBSPOT_PERSONAL_ACCESS_KEY` | HubSpot Private App Access Token with `content` and `files` scope. |
| `HUBSPOT_ACCOUNT_ID` | Your HubSpot Account / Portal ID. |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot Private App Token (used for CMS Pages API). |

---

## 🛠 Local Commands

Install project dependencies:
```bash
npm install
```

Test deployment scripts locally:
```bash
# Test deployment to Design Manager only (dev mode — no page creation)
npm run deploy:dev

# Test deployment to Content Staging (Draft state)
npm run deploy:stage

# Test deployment to Production environment (Published state)
npm run deploy:main
```

---

## 📖 Further Documentation

For full architectural details, API endpoints used, and security guidelines, see [REQUIREMENTS.md](REQUIREMENTS.md).
