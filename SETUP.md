# RiskTech website v20

## What is new in v20
1. One number everywhere: **0913 420 6766** for calls, WhatsApp and payment receipts.
2. Staff page: **Send to NPF first**. The certificate unlocks only after NPF says SUCCESS.
3. Payment page: the **reference is big and bold** at the top, with a Copy button and "type it in Narration / Description / Remark".
4. Slideshow on phones: **left and right arrows**, plus swipe.
5. Each slide matches its insurance: "Get a Health Quote" opens the form with Health already chosen, and "Chat on WhatsApp" sends a matching message.
6. Security hardening (details below).
7. Staff page: clear messages, NPF's exact reply, no double sending, and a **Check NPF connection** button.

## Upload (same as before)
1. Unzip risktech-v20.zip.
2. github.com/risktechbrokers/risktech-website, then Add file, then Upload files.
3. Open the unzipped `risktech` folder and drag **everything inside it** into the box.
4. Message: `v20 security and NPF first`, then Commit changes. Vercel rebuilds in 1 to 2 minutes.

No new Vercel settings are needed. ADMIN_PASSWORD, ADMIN_SECRET, NPF_USERNAME, NPF_PASSWORD and NPF_NIA_NAICOM_ID are all used.

## Daily use (new order)
1. The customer fills the form. You get the email "NEW MOTOR POLICY ORDER".
2. The customer pays and sends the receipt to WhatsApp 0913 420 6766 with their reference (RT-...).
3. Check Jaiz Bank. When the money is there, press "Open in staff page to issue" in the email and sign in.
4. Green "Genuine order from the website" means the link was not changed. A red warning means check every detail against the papers.
5. Tick the payment box, then press **1. Send to NPF**.
6. NPF SUCCESS unlocks **2. Download certificate**. Press it, then "WhatsApp customer", and attach the PDF.
7. Press "Copy row" and paste it into the office spreadsheet.

What the NPF messages mean:
- SUCCESS: done, download the certificate.
- NOT ACCEPTED: NPF rejected a detail. Read "NPF said", correct it, and send again.
- ACCOUNT OR SETTINGS PROBLEM: the account may not be active. Send NPF's full reply to Aliyu.
- TRY AGAIN: NPF did not answer. Wait a few minutes.
- CONNECTION LOST: the internet dropped. Wait 2 minutes and send again. If NPF then says "already exists", the first one worked, so tell IT.

## Security: what the website now does
- Passwords and NPF details live only in Vercel Secrets, never in the code or on GitHub.
- Staff login: 5 wrong tries and that connection is blocked for 15 minutes. Each wrong try is slowed down. A login lasts 8 hours. Changing ADMIN_PASSWORD signs everyone out at once.
- Order links in emails are signed, so an edited link is flagged.
- A certificate can only be made with NPF's SUCCESS receipt, for exactly the details NPF accepted.
- The server re-checks every detail. Requests from other websites are refused. Oversized or broken requests are refused.
- The NPF password is never sent to the browser, even if NPF repeats it in a message.
- A strict browser shield (Content Security Policy) blocks scripts from other websites and stops the site being placed inside another site.
- The staff page and API are hidden from Google.
- The libraries that run on the live site have 0 known weaknesses (npm audit).

## Security: your checklist (the most important part)
The biggest risk is someone getting into an account, not the code.
- [ ] Turn on 2-step verification on GitHub (risktechbrokers), Vercel, Gmail (risktechbrokers@gmail.com), Namecheap and EmailJS.
- [ ] Change ADMIN_PASSWORD in Vercel to a new one only you know (the old one was typed in chat), then Redeploy.
- [ ] EmailJS: Account, then Security, then turn on "Allow EmailJS API for selected domains" with `risktechinsurance.com` and `www.risktechinsurance.com`.
- [ ] Consider making the GitHub repo Private (Settings, then General, then Danger Zone, then Change visibility). Check the site still deploys afterwards.
- [ ] Keep all passwords in the Apple Passwords app, not in notes or chats.

## First live NPF test
1. On the staff page press **Check NPF connection**. It should say "Ready".
2. WhatsApp Aliyu: "We're ready to send the test now, please activate the endpoint."
3. Use a real vehicle with correct papers, then press Send to NPF.
4. Screenshot the result (open "Show NPF's full reply" if it isn't SUCCESS).
