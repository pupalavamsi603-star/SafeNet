# Phone-to-desktop QR workflow verification

- Five-minute in-memory WebSocket sessions added to existing single-worker FastAPI service, with separate capability tokens, first-phone claim, origin checks, creation rate limiting and 1–6000 character validation.
- No schema changes; relay data removed on completion/failure, cancellation or expiry. Existing QR analysis history behavior preserved.
- Pairing uses current frontend origin or optional REACT_APP_PUBLIC_URL. Phone token uses URL fragment; socket credentials use first frame.
- Mobile route reuses QRTab/Html5Qrcode. Desktop uses unchanged /api/ai/qr and ScanResult. Existing image upload, drag/drop and camera remain.
- Six backend relay tests passed: delivery/cleanup, token/role isolation, expiry, phone ownership/reconnect, validation/origin/rate limits, buffered delivery and analysis failure.
- Twenty-two frontend tests passed, including pairing URL correctness, single analysis, cancellation/failure, camera delivery without duplicate AI calls, upload API, camera cleanup and permission denial.
- Lint passed. Production build compiled successfully; existing nonblocking CRA plugin/Node warnings remain.
- Browser two-tab handoff decoded https://example.com from a QR image, delivered to desktop, invoked real analysis and rendered existing result. Phone confirmed Analysis sent. No desktop console errors.
- Direct mobile access at 390px prioritized camera, showed no pairing QR and no horizontal overflow. Desktop pairing QR visually checked at 256px.
- Existing integration run: 32 passed; admin fixture hit existing login rate limit. Admin check passed on focused rerun after cooldown; all 33 checks validated.
- Physical normal-phone-camera scanning and real camera capture unavailable on host. No physical-device success claimed.
- Backend restarts invalidate ephemeral sessions. Multiple workers/instances would need shared relay infrastructure if hosting is later scaled.
