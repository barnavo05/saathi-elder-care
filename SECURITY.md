# Security

Saathi is a static browser app with no backend and no stored secrets.

- Content Security Policy in `index.html` blocks inline scripts, inline styles and outside connections.
- All dynamic text is escaped (`src/text.js`) and covered by tests.
- Prescription input is validated (length, file type, file size) before use.
- Data is kept in the browser's localStorage only.

To report a problem, open an issue on the repository.
