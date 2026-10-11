# Claude Dashboard

Shows your Claude Code sessions per project and each project's requirement status.

**No setup is needed to start.** Open the dashboard and you get sessions and any `docs/specs/MAP.md` status.

To also read requirements from Google Sheets you need a **service account key**:

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project and enable the **Google Sheets API**.
2. Go to **IAM & Admin > Service Accounts**, create a service account, then **Keys > Add key > JSON**. Save the file.
3. Share each Sheet with the service account's email (Viewer is enough).
4. Put the Sheet link in each project's `docs/specs/prd-tracking-sheet.txt`.
5. Run **Claude Dashboard: Select Google Key File** and pick the JSON.
