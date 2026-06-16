# Accident Reporting App

Online accident statement analyzer for AUA accident reporting workflows.

## Current Features

- Paste a driver accident statement.
- Extract accident type, vehicle roles, and likely location.
- Rear-end collision role detection.
- Boundary to avoid wrongly treating simple 2-party rear-end reports as chain collisions.
- Editable extracted details.
- Manual corrections update the diagram.
- Light statement correction note without heavily rewriting the original statement.
- Browser console test runner.

## Run Locally

Open `index.html` directly in a browser.

## Run Test Cases

Open the page, then open the browser console and run:

```js
AccidentApp.runTests()
```

## Deploy with GitHub Pages

1. Go to this repo on GitHub.
2. Open **Settings**.
3. Click **Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Click **Save**.
6. GitHub will provide a live website link after deployment.

Expected link format:

```text
https://xavkorkor.github.io/accident-reporting-app/
```

## Notes

This is the first online version of the latest offline workflow. The logic is rule-based and intentionally editable so future patches can improve rear-end detection and manual review handling without taking the app offline.
