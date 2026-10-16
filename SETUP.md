# RiskTech website v17: how to put it live

## What is new
- Buy Motor Insurance page (/buy): Private Motor N15,000, Motorcycle N3,000, paid by transfer to Jaiz Bank 0025096325.
- Each order is emailed to risktechbrokers@gmail.com with a button that opens it in the staff page.
- Staff page (/admin): download the NPF certificate and send the policy to NPF.
- WhatsApp customer care button (0916 324 3280) on every page, plus WhatsApp in the contact section and footer.
- Google Map of the Yaba office, FAQ section, refreshed home page.
- New company profile PDF, leadership updated to 5 people, NCRIB and share capital removed, indemnity shown as N100,000,000.

No database and no Paystack. Nothing here costs money.

## Step 1: upload to GitHub (browser only, no git needed)
1. Unzip risktech-v17.zip on your phone or computer.
2. Go to github.com/risktechbrokers/risktech-website and sign in.
3. Press "Add file", then "Upload files".
4. Open the unzipped `risktech` folder and drag EVERYTHING inside it (the folders `api`, `shared`, `src`, `public` and the files `package.json`, `package-lock.json`, `vercel.json`, `SETUP.md` and the rest) into the upload box. Do not drag the `risktech` folder itself, drag what is inside it.
5. Write "v17 motor platform" as the message and press "Commit changes".
6. Vercel rebuilds the site by itself in 1 to 2 minutes.

With git instead: unzip over your project folder, then `git add .`, `git commit -m "v17 motor platform"`, `git push`.

## Step 2: settings in Vercel (once)
Vercel > your project > Settings > Environment Variables. Add:

| Name | Value |
|---|---|
| ADMIN_PASSWORD | a long password for the staff page |
| ADMIN_SECRET | any long random text (keeps staff logins safe) |
| NPF_USERNAME | from NPF (ask Aliyu for new ones) |
| NPF_PASSWORD | from NPF |
| NPF_NIA_NAICOM_ID | ask Aliyu which ID to send (their samples show 1140) |

Then Deployments > the latest one > "Redeploy" so the settings take effect.

## Step 3: daily use
1. A customer fills the form on /buy. You get an email "NEW MOTOR POLICY ORDER" with their details.
2. The customer pays and sends the receipt on WhatsApp with their reference (RT-...).
3. Check the Jaiz Bank app. Only when the money is there, open the email and press "Open in staff page to issue".
4. Sign in, check the details, tick "I have checked the Jaiz Bank account", then:
   - press "1. Download certificate", then
   - press "2. Send to NPF". Green SUCCESS means NPF accepted it.
5. Press "WhatsApp customer", attach the certificate PDF in WhatsApp and send.
6. Press "Copy row" and paste it into the office spreadsheet. That spreadsheet is the official record.

The number box suggests the next number (011001, 011002...). It remembers only on the device you use, so always check the last number in the spreadsheet, especially if two people issue certificates.

Walk-in customer: open /admin, press "New walk-in sale" and type the details.

If NPF says RETRY: wait a few minutes and press "2. Send to NPF" again.
If NPF says MANUAL REVIEW: read the message. "Account not enabled" means Aliyu must activate RiskTech's account.

## Good to know
- Order emails use your existing EmailJS account. The free EmailJS plan has a monthly limit (contact form, claims and orders share it). If orders stop arriving by email, the customer still sees a "Send my details on WhatsApp" button, so nothing is lost.
- Prices, cover wording and the bank account are all in one file: `shared/motor.js`.
- Your old company phone 08067514506 is still used on the website. The new profile lists 08055532488. Tell me which one to show.
