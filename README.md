# Network Checker V3 — Automatic Route Explorer

## Deploy on GitHub Pages
1. Backup your existing repository.
2. Upload **index.html**, **route-auto.css**, and **route-auto.js** to the root of the existing repository.
3. Commit to `main` (or open a pull request first).
4. Ensure Settings → Pages → Deploy from branch → main / root.
5. Open `https://YOUR-USERNAME.github.io/network-checker/` with a hard refresh.
6. Scroll to **Automatic Route Explorer**, enter a public IPv4 (e.g. 8.8.8.8), consent to third-party lookups, then click **AUTO DISCOVER**.

## What this version does
- Preserves existing SVG circuit animation, connection test, public-IP detection and manual traceroute.
- Fetches visitor public IP + approximate geolocation using ipwho.is.
- Queries RIPEstat network-info for the target prefix and originating ASNs; opens BGP.he.net as a reference.
- Searches for recent public RIPE Atlas traceroute observations to the target and tries to choose a geographically close Atlas probe.
- Resolves up to 11 public responding hop IPs to approximate locations, then plots them on the existing SVG world map and displays a hop table.
- Can fail gracefully if no measurement exists or API/CORS/rate limits prevent retrieval.

**Very important:** This is NOT an automatic traceroute from the visitor's own device. RIPE Atlas route data comes from third-party probes. Public BGP AS paths are also not geographic router paths. A user-selected source city is not a proof of measured origin. Missing hops are not fabricated.

## Limits / privacy / security
- Entire project is static; no API keys, server or user accounts.
- Consent is required before automatic external lookups.
- Browser requests expose your public IP to API providers. Provider restrictions and quotas apply.
- Simple public IPv4 validation. IPv6, arbitrary hostnames and exact local traceroute are not supported by the automatic panel.
- No browser-exposed arbitrary TCP scans or network agent.
- Content Security Policy explicitly permits only the RIPE Atlas, RIPEstat and IPWho.is API origins in `connect-src`. Existing inline script and style CSP hashes are preserved.
- Public RIPE Atlas probe positions can be privacy-obfuscated and geolocation may be inaccurate.
- Use source links to examine the underlying measurement and timestamp.

## Troubleshooting
Open developer tools → Console/Network. Check browser CORS errors and CSP blocks. The APIs are third-party services and may change or rate limit requests. The project's previous manual traceroute view remains available if no suitable public RIPE Atlas measurement exists.

## Sources
- https://atlas.ripe.net/docs/apis/rest-api-reference/measurements
- https://atlas.ripe.net/docs/apis/rest-api-reference/measurements/measurements_latest
- https://stat.ripe.net/docs/data-api/
- https://ipwho.is/
- https://bgp.he.net/
