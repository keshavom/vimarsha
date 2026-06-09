/* Public config — safe to commit (it holds only a public endpoint URL, never a secret).
 *
 * To collect every saved session into ONE Google Sheet you own:
 *   1. Follow COLLECTION.md to deploy the Apps Script web app.
 *   2. Paste the resulting /exec URL below in place of null.
 *
 * Leave it as null to keep each person's data on their own device only. */
window.VIMARSHA_CONFIG = {
  collectEndpoint: "https://script.google.com/macros/s/AKfycbzDhRFuvWAaSV4T3BDq_EPZGLS9650uy17vw1SRstGvxyc18l0hHsZCZ_VWANz8cFuneA/exec",
};
