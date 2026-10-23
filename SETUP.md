# RiskTech website v21: NPF's new Partner API

## What changed in v21
- The website now uses NPF's new system (motor.npfinsurance.com/partner) with RiskTech's API Key and Secret.
- **NPF now issues everything**: policy number, certificate number, the Certificate PDF and the Brown Card PDF. Our own number series (011001...) and our own certificate maker are gone.
- Buy form now asks for what NPF requires:
  - NIN (11 digits);
  - first and last name, or company name and RC number;
  - state and LGA (NPF's spelling);
  - make, model and body type from NPF's own list.
- Staff page:
  - Send to NPF, then download the Certificate and Brown Card;
  - Correct details (endorse) and Cancel policy;
  - "Check NPF connection" runs free tests that create no policy and use no unit.
- Safety: if NPF does not answer, the page locks "Send" so nobody creates a second policy by accident.
- Privacy: the order link in the email is now locked (encrypted). The email shows only the NIN's last 4 digits, and the staff page's log keeps only the last 4 digits too.

## Step 1: add the two NPF settings in Vercel (do this FIRST)
Vercel, then risktech-website, then Settings, then Environment Variables. Add each one as **Secret**, for **Production**:

| Name | Value |
|---|---|
| NPF_API_KEY | the pk_... key from NPF |
| NPF_API_SECRET | the secret from NPF |

Keep ADMIN_PASSWORD and ADMIN_SECRET. NPF_USERNAME, NPF_PASSWORD and NPF_NIA_NAICOM_ID are no longer used. You can delete them after the first successful policy.

## Step 2: upload to GitHub (same as before)
1. Unzip risktech-v21.zip.
2. github.com/risktechbrokers/risktech-website/upload/main
3. Open the `risktech` folder, press Cmd + A, and drag everything into the box.
4. Message `v21 NPF partner API`, then Commit changes.
5. Wait for Vercel to show Ready.

Two old files stay on GitHub because uploading never deletes files: `api/_lib/certificate.js` and `api/_assets/npf-bg.jpg`. They are no longer used and do no harm. To tidy up, open each one on GitHub, then the ... menu, then Delete file.

## Step 3: free tests (no real policy, no unit used)
1. Open risktechinsurance.com/admin, sign in, and press **Check NPF connection**. You want three green ticks:
   - Key accepted, with the number of makes and body types;
   - Private Motor and Motorcycle each matched to an NPF product (with NPF's price per unit);
   - Sending works (NPF refused the empty test request).
2. Open risktechinsurance.com/buy and check the Make list shows NPF's makes.

If a product shows a red cross, NPF has not enabled that product on RiskTech's account. Ask Aliyu.

## Step 4: the first real policy
There is no test system at NPF: every successful policy is real and uses one unit. So the first one should be a real paying customer, sent while Aliyu is available.
- Confirm with NPF that units are loaded in RiskTech's wallet (agreed: NPF loads units, RiskTech settles NPF's share per policy sold).

## Daily use
1. A customer fills the form. You get the email "NEW MOTOR POLICY ORDER".
2. The customer pays into Jaiz Bank and sends the receipt to WhatsApp 0913 420 6766.
3. When the money is in Jaiz, open the email, press "Open in staff page to issue" and sign in.
4. Check the details. If the customer typed a make that is not on NPF's list, pick the closest one.
5. Tick the payment box, then press **Send to NPF**.
6. When NPF says POLICY ISSUED:
   - press Certificate, then Brown Card;
   - press WhatsApp customer and attach both PDFs.
7. Press "Copy row" in the list and paste it into the office spreadsheet.

What the NPF messages mean:
- **POLICY ISSUED**: done.
- **NOT ISSUED**: NPF rejected a detail and used no unit. Read "NPF said", correct it, and send again.
- **No units left**: NPF must load units. Nothing was used.
- **KEY OR ACCOUNT PROBLEM**: check the two Vercel settings, or ask NPF.
- **NO ANSWER (DO NOT SEND AGAIN)**: NPF may or may not have created the policy. WhatsApp Aliyu the plate number and the time. Only if he confirms it was NOT created, tick the box and send again.

Corrections and cancellations: use "Correct details" or "Cancel policy" in the list. The cover type cannot be changed. NPF does not refund the unit automatically when a policy is cancelled.

Customers can download their own documents any time at motor.npfinsurance.com/policy-lookup with their policy number, plate number and phone number.

## Security checklist (still to do)
- [ ] 2-step verification on GitHub, Vercel, Gmail, Namecheap and EmailJS.
- [ ] Change ADMIN_PASSWORD in Vercel (the old one was typed in chat), then Redeploy.
- [ ] After testing, ask NPF to regenerate the API Secret (it was pasted in chat). Put the new one in Vercel and Redeploy.
- [ ] EmailJS: allow only risktechinsurance.com and www.risktechinsurance.com.
