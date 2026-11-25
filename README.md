# EPC Project Controls

A browser-based project controls tool for EPC (engineering, procurement, construction) projects:
project registration, E/P/C progress updates, discipline and overall status reports, S-curves,
EVM (SPI/CPI), resource planning, crashing / fast-tracking / smoothing suggestions, L0–L5 schedules
with Microsoft Project XML export, 2-week / 1-month / 7-week look-aheads, delay analysis and a
time–chainage line diagram, and auto-scheduling from the PO date to the delivery date.

Live site: https://arzio-projects.github.io/

## Data storage
- Data is kept in the browser and, once connected, in one file (`EPC_Project_Controls_data.json`)
  in the signed-in user's Google Drive (scope `drive.file`: the app only sees files it created).
- The Google OAuth client ID is set in `index.html` (`window.EPC_CONFIG.googleClientId`) or by an
  admin on the Export page.
- Project data is not stored in this repository.

## Organization and login
On first use the app asks for the organization's details (name, code, type, address, GSTIN, contact)
and creates the administrator account. Users sign in with organization code, user name and password.
Admins manage organization details and users under "Organization & users". Login is enforced in the
browser only; it is not server-side security.

## Build
`index.html` is generated: `python3 src/build.py src/starter_project.json index.html`
