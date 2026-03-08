---
active: true
iteration: 1
session_id: 
max_iterations: 5
completion_promise: null
started_at: "2026-03-08T16:21:39Z"
---

Security audit for public release: Review all source files for leaked secrets, hardcoded tokens, API keys, credentials, or sensitive data. Check git history for any accidentally committed secrets. Verify .gitignore covers all sensitive files. Check that no 1Password references resolve to actual values in source. Ensure wrangler secrets are not hardcoded. Verify CORS, CSP, auth, and input validation are production-ready. Check that account IDs and database IDs are safe to expose publicly. Audit all fetch calls for SSRF. Verify README rendering cannot execute scripts.
