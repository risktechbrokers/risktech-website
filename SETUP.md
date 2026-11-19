# RiskTech website v22: shared policy list, safety checks, 2-step login

## What changed in v22
1. **Shared policy list.** Every policy is saved on the server, so anyone signed in on any computer or phone sees all policies, corrections and cancellations. Search, Refresh and "Show more" were added.
2. **Plate note in "Correct details".** The plate box stays, with a note that NPF may refuse plate changes and what to do then.
3. **3 checks before "Send to NPF":** money confirmed, plate checked against the papers (shown in big letters), and name and NIN checked. The button stays locked until all 3 are ticked. Changing the plate clears its tick.
4. **Monthly report** for settling with NPF: policies issued (units used), cancelled, premium, and an estimate of NPF's share after RiskTech's commission %. Includes a CSV download.
5. **"Check your details" screen** for customers before they see the bank details.
6. **Plate check** that warns about likely mix-ups (0/O, 8/B, 1/I and so on), on the buy form and the staff page.
7. **Terms and Refund Policy** page (/terms) and **Privacy Notice** (/privacy), plus a required tick box before paying. Both are linked in the footer.
8. **NIN privacy notice** under the NIN box.
9. **On/off switch for each cover** (staff page, "Website and security settings"). A paused cover shows "Paused for now" and cannot be ordered.
10. **2-step login**: the staff password plus a 6-digit code from Google Authenticator or Microsoft Authenticator.
11. **Auto sign-out** after 30 minutes with no activity, and always after 8 hours.
12. **Email alerts** for policies issued, corrections, cancellations and sign-ins.
13. **Activities**: a history on the staff page of every sign-in, failed sign-in, sign-out, website order, policy sent to NPF (issued, not issued or no answer), correction, cancellation, download, cover switched on or off, and 2-step setup. Each line shows the time, the device (for example "iPhone, Safari"), the city and the network address. It has filters and a search box, everyone signed in sees the same history, and it keeps 12 months.

## Step 1: push to GitHub from VS Code
The new code is already in `~/Downloads/risktech` on the Mac. Open that folder in VS Code, open the Terminal (View, then Terminal) and run:

```
cd ~/Downloads/risktech && git init && git remote add origin https://github.com/risktechbrokers/risktech-website.git && git fetch origin && git reset origin/main && git branch -M main && git add -A && git status
```

This links the folder to the website's GitHub and lists what will change. Check that **no `.env` file** is in the list. Then run:

```
git commit -m "v22 shared list, Activities and safety checks" && git push -u origin main
```

If a browser window asks you to log in to GitHub, use the **risktechbrokers** account. Vercel puts the new site live in about 2 minutes.

Next time, there's no need to repeat `git init`. Just run `git add -A && git commit -m "what changed" && git push`.

The site works straight away. Until you finish Step 2, the list still shows "this device only", and Activities say they start once storage is on.

## Step 2: switch on the shared list (free Vercel Blob storage)
1. Go to Vercel, then risktech-website, then **Storage**, then **Create Database**, then **Blob**.
2. Name it `risktech-files`. Choose **Private** access. Create it and **Connect** it to the risktech-website project (Production). Vercel adds the setting BLOB_READ_WRITE_TOKEN by itself.
3. Go to Deployments, then the ... menu on the latest one, then **Redeploy**.
4. Open the staff page. The list should say **"All policies (every device)"**, and Settings should show "Shared list and switches: ON".
5. **On each computer or phone that issued policies before**, open the staff page. If you see "X policies were issued on this device before the shared list existed", press **Move them to the shared list**. Do this on every device that was used. Adebayo David's policy is on one of them.

The free plan allows 1 GB of storage. The policy list is tiny (about 1 KB per policy).

**The free plan allows 2,000 saves a month.** If it goes over, Vercel blocks the storage for 30 days (you aren't charged). To prevent that:
- issuing a policy and recording it in Activities is one save;
- repeated failed sign-ins and repeated downloads are grouped (at most one line every 10 minutes);
- after 1,500 saves in a month, sign-ins, downloads and website orders stop being added to Activities until the next month, so the policy list keeps working;
- Settings shows "Storage saves this month: X of 2000".

Don't browse the files in Vercel's Storage page more than needed: Vercel counts those clicks as saves too.

## Step 3: email alerts
1. In EmailJS, go to Account, then Security, and turn on **"Allow EmailJS API for non-browser applications"**. Copy the **Private Key** shown on the Account page.
2. In EmailJS, go to Email Templates, then **Create New Template**:
   - To Email: `{{to_email}}`
   - Subject: `{{subject}}`
   - Content: `{{{message}}}` (three curly brackets, so the table shows properly)
   - Save it, then copy its Template ID.
3. In Vercel, go to Settings, then Environment Variables, and add each of these as **Secret**, for **Production**:

| Name | Value |
|---|---|
| EMAILJS_PRIVATE_KEY | the Private Key from step 1 |
| EMAILJS_ALERT_TEMPLATE_ID | the new Template ID from step 2 |
| ALERT_EMAIL_PERSONAL | your personal email (gets sign-in, correction and cancel alerts) |

4. Redeploy.

Who gets what:
- Policy issued goes to the company inbox.
- Correction and cancellation go to both emails.
- Sign-in goes to the personal email, at most once an hour.

Alerts never include the NIN. If ALERT_EMAIL_PERSONAL is not set, everything goes to the company inbox. Each alert uses one email from the EmailJS monthly allowance (200 on the free plan).

## Step 4: 2-step login (do this after Step 1)
1. On the phone, install **Google Authenticator** or **Microsoft Authenticator**.
2. On the staff page, go to Website and security settings and press **Set up 2-step login**. Scan the QR code, then type the 6-digit code and press **Check code**.
3. When it says "The code works", press **Copy the key**. In Vercel, add `ADMIN_TOTP_SECRET` (Secret, Production) with that key as its value, then Redeploy.
4. From now on, sign in with the password plus the code from the app. Everyone is signed out once, when it is switched on.
5. **Save the key in a password manager** (for example the iPhone Passwords app). If the phone is lost, or a new staff member needs access, they add the same key in their authenticator app with "Enter a setup key".
6. If you are ever locked out: delete ADMIN_TOTP_SECRET in Vercel and Redeploy. The login goes back to password only.

## Daily use
1. A customer fills the form, checks their details, ticks the terms box and sees the bank details. You get the email "NEW MOTOR POLICY ORDER".
2. When the money is in Jaiz, open the email, press "Open in staff page to issue" and sign in.
3. Check the details. Under **Checks before sending**, tick all three. Compare the big plate letter by letter with the vehicle papers.
4. Press **Send to NPF**. Then download the Certificate and Brown Card, and WhatsApp the customer.
5. The policy now appears in **All policies** for everyone.

**When NPF has no units for a cover:** switch that cover off in Settings, so customers don't pay for cover we can't issue. Switch it back on when NPF loads units. Staff can still issue from the staff page while a cover is paused.

**Monthly report:** choose the month and enter RiskTech's commission % (ask NPF for it). It shows an estimate of what to pay NPF. Always check it against NPF's own statement.

**NPF messages** (same as before):
- **POLICY ISSUED**: done.
- **NOT ISSUED**: NPF rejected a detail and used no unit. Fix it and send again.
- **No units left**: NPF must load units.
- **NO ANSWER (DO NOT SEND AGAIN)**: ask Aliyu whether it was created. This order is now blocked on every device until someone ticks "NPF has confirmed the policy was NOT created".

## Before going live
- [ ] Management (or a lawyer) reads /terms and /privacy and agrees to the refund rules: full refund before issue within 5 working days; no refund after issue except for double payment or our mistake.

## Security checklist (still to do)
- [ ] 2-step verification on GitHub, Vercel, Gmail, Namecheap and EmailJS.
- [ ] Change ADMIN_PASSWORD in Vercel (the old one was typed in chat), then Redeploy.
- [ ] Ask NPF to regenerate the API Secret (it was pasted in chat). Put the new one in Vercel and Redeploy.
- [ ] Make the GitHub repository private (Settings, then Danger Zone, then Change visibility).
- [ ] EmailJS: allow only risktechinsurance.com and www.risktechinsurance.com.

## For later (not built yet)
- A "Check on NIID" button next to each policy.
- A separate login for each staff member.
- A manager password before cancelling.
- Renewal reminders.
- Online payment (Paystack or Monnify).
- Photo and document uploads (buy form and claims) and a staff Claims section.
