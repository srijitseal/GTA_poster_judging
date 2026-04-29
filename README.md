# 2026 GTA Poster Judging Website

This folder contains a static judging website plus a Google Apps Script backend.

## Google Apps Script setup

1. Create a Google Sheet for judging responses.
2. In the Sheet, open `Extensions -> Apps Script`.
3. Paste `apps-script/Code.gs` into the Apps Script editor.
4. Save, then run `setupBackend` once from the Apps Script editor.
5. Approve permissions.
6. Deploy with `Deploy -> New deployment -> Web app`.
7. Use:
   - Execute as: `Me`
   - Who has access: `Anyone`
8. Copy the Web App URL ending in `/exec`.
9. Paste the `/exec` URL into `config.js` as `appsScriptUrl`.
10. Push the site to GitHub Pages.
11. Paste the GitHub Pages website URL into the Google Sheet `Settings` tab cell `B2`.
12. Paste the Apps Script `/exec` URL into the Google Sheet `Settings` tab cell `B3`.
13. Copy judge links from the `Judge Links` tab.

The `Responses` tab stores only the latest score for each judge/poster pair.
The `Audit` tab stores every create/update event, so edits are traceable.
The admin link opens both the live results tab and every judge workspace. Admin-entered edits are saved as that judge and marked as `ADMIN` in the audit log.

## GitHub Pages

Push these files to a GitHub repository and enable GitHub Pages for the branch.
The website does not need a build step.

Do not share the backend Google Sheet with judges. They only need their private judging link.
