// Terms and Refund Policy, and the Privacy Notice. Plain English on purpose.
// Business rules here (refund times, what can be changed) must be agreed by management before going live.
import { ArrowLeft } from "lucide-react";
import { PRODUCTS, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, NPF_LOOKUP_URL } from "../../shared/motor.js";
import { naira } from "../lib/api";

const UPDATED = "19 November 2026";
const ADDRESS = "Shop 41, Alakija Shopping Complex, WAEC Street, Jibowu, Yaba, Lagos";

const H = ({ children }) => <h2 className="text-lg font-bold text-gray-900 mt-8 mb-2">{children}</h2>;
const L = ({ children }) => <ul className="list-disc pl-5 space-y-1.5">{children}</ul>;

const Terms = ({ navigate }) => (
  <>
    <p>These terms apply when you buy third party motor insurance on this website. RiskTech Insurance Brokers Limited ("RiskTech", "we") is an insurance broker. The policy itself is issued and underwritten by <b>NPF Insurance Company Limited</b> ("NPF").</p>

    <H>1. What you are buying</H>
    <L>
      <li>Third party motor insurance for one vehicle for one year: {Object.values(PRODUCTS).map((p) => `${p.label} at ${naira(p.premium)}`).join(", and ")}.</li>
      <li>It covers your legal liability to other people (their injury, death or property damage) as set out in NPF's policy. It does not cover damage to your own vehicle.</li>
      <li>The exact cover, limits and exclusions are in the NPF policy and certificate you receive.</li>
    </L>

    <H>2. Your details</H>
    <L>
      <li>You must give true and complete details. The name, plate number, chassis number and engine number must match your vehicle papers and ID.</li>
      <li>Your certificate is printed with the details you give us. Please check them on the "Check your details" screen before you pay.</li>
      <li>If false details are given on purpose, NPF may refuse a claim or cancel the policy.</li>
    </L>

    <H>3. Payment and issuing</H>
    <L>
      <li>You pay by bank transfer to RiskTech's account shown on the payment screen, using your order reference as the narration.</li>
      <li>We issue your policy through NPF once we confirm your money has arrived, usually the same working day. You get the Certificate and Brown Card on WhatsApp or email.</li>
      <li>Your cover starts on the start date shown on the certificate, not before. Do not drive uninsured while you wait.</li>
      <li>You can check your policy any time on NPF's site: {NPF_LOOKUP_URL}</li>
    </L>

    <H>4. Mistakes and corrections</H>
    <L>
      <li>If a detail on your certificate is wrong, contact us as soon as possible. We will ask NPF to correct it.</li>
      <li>Some changes can only be made by NPF, and NPF may refuse some changes (for example a different plate number). If NPF cannot correct it, a new policy may be needed, and you may have to pay for it if the mistake came from the details you gave.</li>
      <li>If the mistake was ours, we fix it at no cost to you.</li>
    </L>

    <H>5. Refunds</H>
    <L>
      <li><b>Before your policy is issued:</b> if you change your mind or we cannot issue the policy, we refund the full amount to the account you paid from, usually within 5 working days.</li>
      <li><b>After your policy is issued:</b> the policy is live and registered, so we cannot refund it, except as below.</li>
      <li><b>Paid twice or paid too much:</b> we refund the extra amount.</li>
      <li><b>Our mistake:</b> if we issued the wrong cover or wrong details because of our error, we correct it or refund you.</li>
      <li>To ask for a refund, send your reference and the bank account that paid to us on WhatsApp ({CONTACT_PHONE_DISPLAY}) or email ({CONTACT_EMAIL}).</li>
    </L>

    <H>6. Claims</H>
    <p>Claims are decided and paid by NPF under the policy. We help you report and follow up your claim. See our <button type="button" onClick={() => navigate("claims")} className="text-blue-700 underline">claims page</button>.</p>

    <H>7. Your data</H>
    <p>We handle your personal data as set out in our <button type="button" onClick={() => navigate("privacy")} className="text-blue-700 underline">Privacy Notice</button>.</p>

    <H>8. Complaints</H>
    <p>Contact us first at {CONTACT_EMAIL} or {CONTACT_PHONE_DISPLAY}. If you are not satisfied with our answer, you may contact the National Insurance Commission (NAICOM).</p>
  </>
);

const Privacy = ({ navigate }) => (
  <>
    <p>This notice explains how RiskTech Insurance Brokers Limited ("we") uses your personal data when you buy motor insurance on this website, in line with the Nigeria Data Protection Act 2023.</p>

    <H>1. What we collect</H>
    <L>
      <li>Your name (or company name and RC number), phone number, email (optional) and address.</li>
      <li>Your <b>NIN</b> (National Identification Number).</li>
      <li>Your vehicle details: plate, make, model, body type, colour, year, chassis and engine numbers.</li>
    </L>

    <H>2. Why we collect it</H>
    <L>
      <li>To issue your insurance policy through NPF Insurance and send you the certificate.</li>
      <li>NPF and the insurance regulator require the NIN for every motor policy. We do not use it for anything else.</li>
      <li>To contact you about your policy, corrections, renewals and claims.</li>
      <li>To keep records that the law and NAICOM require.</li>
    </L>

    <H>3. How we protect your NIN</H>
    <L>
      <li>It is sent over an encrypted connection and locked so only signed-in RiskTech staff can open it.</li>
      <li>It is never shown on our website, and order emails show only the last 4 digits.</li>
      <li>Our own policy records keep only the last 4 digits. The full NIN is kept by NPF on your policy.</li>
    </L>

    <H>4. Who we share it with</H>
    <L>
      <li><b>NPF Insurance Company Limited</b>, which issues your policy and registers it on the Nigerian Insurance Industry Database (NIID).</li>
      <li>Service providers that run our website and email (for example our web host and email service), only as needed to run the service.</li>
      <li>Regulators or law enforcement when the law requires it.</li>
      <li>We do not sell your data or use it for advertising.</li>
    </L>

    <H>5. How long we keep it</H>
    <p>We keep policy records for as long as the law and insurance rules require (usually several years after the policy ends), then delete them.</p>

    <H>6. Your rights</H>
    <p>You can ask to see the data we hold about you, correct it, or ask us to delete it where the law allows. Contact us at {CONTACT_EMAIL} or {CONTACT_PHONE_DISPLAY}, or visit us at {ADDRESS}. You can also complain to the Nigeria Data Protection Commission (NDPC).</p>

    <p className="mt-6">See also our <button type="button" onClick={() => navigate("terms")} className="text-blue-700 underline">Terms and Refund Policy</button>.</p>
  </>
);

const LegalPage = ({ kind, navigate }) => {
  const terms = kind === "terms";
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate("buy")} className="flex items-center gap-2 text-blue-300 hover:text-white mb-6 text-sm font-medium"><ArrowLeft size={16} /> Back to Buy Motor Insurance</button>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Playfair Display',serif" }}>{terms ? "Terms and Refund Policy" : "Privacy Notice"}</h1>
          <p className="text-blue-200 text-sm mt-2">Last updated {UPDATED}</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <article className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm text-gray-700 text-[15px] leading-relaxed" data-testid={`legal-${kind}`}>
          {terms ? <Terms navigate={navigate} /> : <Privacy navigate={navigate} />}
        </article>
      </div>
    </div>
  );
};

export default LegalPage;
