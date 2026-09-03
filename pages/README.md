# Landing Pages Directory (`pages/`)

This directory contains all HTML landing pages managed by this repository.

## How it works

1. **Adding a New Landing Page**:
   - Create a new `.html` file inside this directory (e.g. `pages/my-new-page.html`).
   - Use kebab-case for filenames.
   
2. **Deployment Behavior**:
   - **`dev` branch**: Pushing or merging to `dev` publishes the page as a **Draft** under **HubSpot Content Staging** (`DRAFT` state).
   - **`main` branch**: Pushing or merging to `main` publishes the page **Live** under **HubSpot Landing Pages** (`PUBLISHED` state).

## Guidelines for HTML Pages

- Ensure standard HTML5 boilerplate with `<head>` and `<body>` tags.
- Inline CSS (`<style>`) or embedded CSS is recommended for standalone landing pages.
- If using HubSpot HubL tags or modules, ensure syntax is valid.
- Page title (`<title>`) and meta description (`<meta name="description">`) will be used by HubSpot as the default CMS page metadata.
