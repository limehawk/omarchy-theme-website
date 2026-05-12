#!/usr/bin/env bash
# Compatibility wrapper for the old CF Pages build command.
# Now just runs the static build. The "scrape" step moved to a nightly GH Action.
exec node scripts/build.js
