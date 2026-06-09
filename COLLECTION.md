# Collecting all submissions into one Google Sheet

This lets every person who uses your shared link have their saved sessions land in
**one Google Sheet you own** — no login for them, works on phones. The secret stays
on Google's servers; your public site never holds a token.

Do this once. It takes about 5 minutes.

## 1. Make the Sheet
1. Go to **https://sheets.google.com** → **Blank spreadsheet**.
2. Rename it (top-left), e.g. *Vimarsha Submissions*. You don't need to add any columns — the script creates them.

## 2. Add the script
1. In that Sheet, click **Extensions → Apps Script**. A code editor opens in a new tab.
2. Delete whatever is in the `Code.gs` box.
3. Open `collector.gs` from this project, copy **everything**, and paste it in.
4. Click the **Save** icon (💾).

## 3. Deploy it as a Web App
1. Click **Deploy → New deployment**.
2. Click the gear ⚙️ next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Vimarsha collector`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**  ← important, so visitors can submit
4. Click **Deploy**.
5. Click **Authorize access** → pick your Google account → if you see "Google hasn't verified this app", click **Advanced → Go to (your project) → Allow**. (This is normal for your own scripts.)
6. Copy the **Web app URL** — it ends in `/exec`.

## 4. Plug the URL into the app
1. Open `config.js` in this project.
2. Replace `null` with your URL in quotes:
   ```js
   window.VIMARSHA_CONFIG = {
     collectEndpoint: "https://script.google.com/macros/s/AKfy.../exec",
   };
   ```
3. Save, commit, and push. GitHub Pages will redeploy in a minute.

## 5. Test it
- Open your live site, log a session, and hit **Save**.
- Go back to the Sheet → a **Submissions** tab appears with the row. 🎉
- Each future submission from anyone adds a new row automatically.

### Notes
- Visitors still keep a local copy in their own browser, so the app works offline too.
- If you ever change `collector.gs`, redeploy with **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (keeps the same URL).
- The Sheet is private to you; submitters can't see each other's data.
