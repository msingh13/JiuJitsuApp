# Food photo estimates: connection pending

The meal editor now captures or uploads photos and saves them with the meal. Nutrition remains manually entered. The AI button is intentionally disabled until a secure service is connected; no photo is sent to an AI provider today.

To enable estimation later:

1. Finish Supabase authentication and private storage setup in CLOUD-SETUP.md.
2. Choose an AI provider and approve its usage billing. Store its key only in a server-side secret, never a VITE variable or GitHub Pages bundle.
3. Add an authenticated server function that verifies the caller owns the selected meal photo, limits image size and request frequency, and sends the image only after an explicit “Estimate nutrition” action.
4. Ask for portion size and preparation details. Return bounded numeric estimates for calories, protein, carbs, fat, fiber, saturated fat and sodium, with units, assumptions and uncertainty. A photo cannot reliably reveal hidden ingredients, exact portions or micronutrients; leave unknown values unfilled rather than fabricating precision.
5. Show an editable review before applying estimates to the meal. Do not silently replace existing manual values. Label saved estimates as estimates.
6. Test cross-account denial, provider errors, unsupported images, cancellation and retries, and ensure no key appears in the client build.

Current attachments are included in complete browser backups. Clearing browser data can still remove them unless backed up or synced after cloud setup.
