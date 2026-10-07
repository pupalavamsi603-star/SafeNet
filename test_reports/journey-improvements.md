# SafeNet journey improvements — 7 October 2026

## Scope and audit

Existing React 19 / CRA + CRACO / Tailwind frontend; FastAPI, MongoDB, cookie JWT and native bearer authentication. No Supabase integration exists in this repository. API endpoints, scoring, schemas, credentials, deployment configuration and dependencies were preserved. The unrelated `.claude/settings.local.json` file was not edited.

Local Home and URL scanner were inspected before editing. The deployed reference was inspected read-only. Reproduced: History redirected to generic `/login`, losing intent; the generic hero action selected URL scanning. Code inspection confirmed QR/message results are stored automatically for authenticated calls, URL assessments are not stored, and there is no endpoint to save an existing guest assessment.

## Route / journey checklist

| Route | Role | Changes / check |
| --- | --- | --- |
| `/` | Public entry | Four real tool destinations, compact chooser for generic checks, private quick-link handoff, account benefits, learning, urgent help, final CTA. |
| `/ai?tab=url` | Guest/account | Original API and validation; bounded restoration; one real score; report context; explicit lack of URL history. |
| `/ai?tab=qr` | Guest/account | Selected upload/camera/phone methods; original decoder, cleanup and polling; local decoding and genuine AI response checked. |
| `/ai?tab=detect` | Guest/account | Original limits/API; preserved input/results, real evidence and protective actions, editable report excerpt. |
| `/ai?tab=chat` | Guest/account | Real streamed conversation checked; safe existing Markdown; history/retry/expired-session states; send guard; no redundant floating assistant. |
| `/qr/phone/:id` | Temporary token | Existing route/ownership/expiry/transport preserved; physical phone not tested. |
| `/dashboard` | Account | First action tool choices, existing real counts/activity, learning/certificate/safety plan preserved; fixtures tested, authenticated browser check deferred. |
| `/dashboard?view=history` | Account | Contextual auth, available activity filters/search/date/result, session expiry; no fabricated full records/scores. |
| `/login`, `/register` | Account entry | Allowlisted return destinations through switching/email/Google; explicit actions/context; original auth services preserved. No authenticated browser sign-in performed. |
| `/quiz` | Account | Guest redirect retains Quiz; requirement explained on learning entry points. Quiz logic unchanged. |
| `/scams`, `/scams/:slug` | Public learning | Actual-data guide search/severity, relevant QR/link/message scanner destinations; examples labeled as scenarios; missing vs unavailable guide distinguished. |
| `/tips` | Public learning | Actual categories, expandable practical steps, explained Quiz entry. |
| `/report` | Public reporting | Supported context only, no inferred accusation/category/loss; editable/review/confirmation; draft/errors; official help and truthful scope. |
| `/contact` | Public support | Placeholder email and unsupported reply SLA removed; actual contact endpoint retained; bounded draft and visible failure. |
| `/about` | Public purpose | Public composition and explicit tools destination; existing purpose/capabilities/limitations. |
| `/admin`, not found | Existing | Preserved existing protection/routing; admin not browser-tested. |

No Profile, Settings, verification or password-recovery routes are implemented in the existing app; unsupported controls were not invented.

## Implementation passes

1. Contextual navigation and explicit entry points; duplicate homepage tool chooser consolidated.
2. Safe authentication continuation for History, Quiz and scanners; shared Google completion uses the same destination.
3. Tab-scoped latest scanner/report/support drafts, max 65 KB each, 15-minute expiry, bounded keys, automatic purge and logout cleanup. No credentials in drafts or return URLs. No new analysis is sent on restoration. Only the selected guest check may continue through authentication; it is not attached to account history.
4. Report review, duplicate-submit guards, actual save semantics, activity filtering, AI retrieval/error handling and connected learning/support.
5. Restrained blue/white/purple presentation, controlled scanner/reading widths, compact footer and benefits, readable mobile fields and touch controls; reduced-motion styles preserved.
6. Responsive, keyboard, browser integration and regression verification.

## Verification

- Frontend tests: **64 passed / 10 suites**.
- Existing lint and additional lint of new/changed navigation, auth and draft helpers passed.
- Production build compiled successfully. Initial JS remains about **172.6 KB gzip**. The build script still prints its pre-existing ESLintWebpackPlugin and Node deprecation notices; separate ESLint passes.
- JavaScript project: no separate typecheck command exists.
- Browser layout checks: Home, all four `/ai` tools, About, scam library, QR guide detail, Tips, Report, Contact, Login and Register across approximately **1440, 1280, 768 (observed 769), 390 and 360 CSS pixels**; no document horizontal overflow. A second measured pass accounted for the in-app browser's zoom.
- Actual local backend: URL `https://example.com` returned safe/10; uploaded QR for that URL decoded and returned suspicious/60; harmless OTP-request message returned high risk/95; AI streamed a completed real reply. Provider results were rendered unchanged.
- Assessment survived Report Back and refresh without another analysis. Quick-link entry arrived with the entered URL while the browser URL remained `/ai?tab=url`.
- Report prefill is editable and contains no unrelated earlier URL/loss. Review did not submit; confirmation followed a genuine `/reports` success using a clearly labeled disposable local QA report in the separate `safenet_ui_journey_verify` database. No production report or message to a real recipient was submitted.
- Real local guide search, category/disclosure controls, QR guide destination, History/Quiz auth continuation, login/signup switching, chooser Escape/focus, mobile menu Escape/focus and QR method selection were checked.
- Camera permission denial/cleanup, phone delivery, request guards, expiry, ownership, auth completion, report failure and saving/restoration behavior are covered by focused tests.
- No deployment or push was performed for this task.

## Remaining dependencies / unverified areas

- No backend endpoint exists to save an old guest assessment or a URL result; UI does not claim such a save or repeat analysis to simulate it.
- Activity API supplies up to 20 summaries with type/title/status/timestamp, not full targets, risk scores, pagination or stored assessment details. Those missing fields/actions cannot be added truthfully within this frontend-only scope.
- Authenticated Dashboard/History, real account creation/sign-in/OAuth completion, physical camera and physical phone-to-desktop pairing were not browser-verified. Earlier user preference to finish without an authenticated browser check was honored. Local Google GIS origin configuration produced the existing origin-not-allowed warning; OAuth configuration was not altered.
- Original backend persistence and guest chat ownership remain unchanged. Guest conversations are not migrated to another account.

Official reporting resources checked read-only: [India National Cyber Crime Reporting Portal](https://cybercrime.gov.in/) and [FBI IC3](https://www.ic3.gov/).
