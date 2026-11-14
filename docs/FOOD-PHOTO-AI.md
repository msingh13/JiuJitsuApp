# Food photo estimates

Prepared, not connected. Keep `VITE_FOOD_PHOTO_AI` false until verified. Owner requires **free services only**: no billing, paid fallback, or upgrades.

The editor supports choosing a cloud photo, describing the portion, requesting an estimate, reviewing it, and explicitly applying it. Returned nutrients replace corresponding fields; unknown nutrients remain unchanged. Assumptions are saved in notes. Saving the meal is still explicit. The disconnected UI clearly explains that photos alone do not calculate calories.

## Setup remaining

1. Complete Google sign-in in CLOUD-SETUP.md.
2. Owner signs in to Google AI Studio and reviews its terms. Use a project without billing; verify an image-capable model has free quota for this account/region. Never assume a rate limit is a spending cap. No paid fallback is permitted.
3. Store the Gemini key only in Supabase function secret `GEMINI_API_KEY`; set `GEMINI_MODEL` to the verified free model. Never use VITE variables for secrets. Credential creation/entry may require owner handoff.
4. Apply `202611110001_nutrition_quota.sql` after the private journal migration (both applied Nov 11). This enforces 10 attempts per account per UTC day, atomically. Users cannot reset quotas. Failed provider requests count.
5. Deploy `supabase/functions/estimate-nutrition` including index.ts and validation.js. Keep JWT verification enabled. Function also verifies Auth and uses caller-scoped RLS for media. No service-role data access. Images are capped at 8 MB; AI requests time out after 45 seconds.
6. Verify signed-out/cross-account denial, quota exhaustion, unsupported/oversized photos, malformed provider output, and a real estimate using a disposable food-only image. Confirm errors leave meal values unchanged. Live provider integration remains untested.
7. Only after verification set GitHub repository variable `VITE_FOOD_PHOTO_AI=true` and deploy Pages.

## Free-service privacy

Google's unpaid-service terms allow product improvement using inputs/outputs and prohibit sensitive/confidential/personal information. UI discloses this before the explicit send action. Do not send private journal text, names, health details or face photos. Only selected food image and portion text go to Gemini. Review suitability for intended users before enabling.

References: https://ai.google.dev/gemini-api/terms and https://ai.google.dev/gemini-api/docs/pricing.

Supabase Free can pause with inactivity and has shared storage/transfer limits. No billing accounts or paid plans were enabled.
