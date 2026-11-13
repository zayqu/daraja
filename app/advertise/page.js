import Link from "next/link";
import audienceModule from "@/lib/whatsapp-channel-audience.cjs";
const { verifiedPublicAudience } = audienceModule;
import ContentPage from "@/components/ContentPage";
import { loadSiteSettings, siteSetting } from "@/lib/features";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Advertise a vacancy | DARAJA",
  description:
    "Promote your vacancy to Tanzanian job seekers on the DARAJA WhatsApp Channel and as a Featured job on Daraja Ajira.",
  alternates: { canonical: "/advertise" },
};

function followersLabel(followers) {
  if (Number.isSafeInteger(followers) && followers >= 1000) {
    return `${Math.floor(followers / 1000)}k+`;
  }
  if (Number.isSafeInteger(followers) && followers >= 0) {
    return followers.toLocaleString("en-GB");
  }
  return "audience details available on WhatsApp";
}

function bookingLink(number, price) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const message = `Hello Daraja, I would like to advertise a vacancy (Featured job, TZS ${price}).`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default async function AdvertisePage() {
  await loadSiteSettings();
  const publicSnapshot = verifiedPublicAudience(siteSetting("channel.publicAudience"));
  const followers = publicSnapshot ? `about ${publicSnapshot.label}` : followersLabel(siteSetting("channel.followers"));
  const priceValue = siteSetting("promo.price");
  const price = (Number.isSafeInteger(priceValue) && priceValue > 0 ? priceValue : 30000).toLocaleString("en-GB");
  const daysValue = siteSetting("promo.days");
  const days = Number.isSafeInteger(daysValue) && daysValue > 0 ? daysValue : 14;
  const whatsappBooking = bookingLink(siteSetting("promo.whatsapp"), price);
  const lipaNamba = String(siteSetting("promo.lipaNamba") || "").trim();
  const lipaName = String(siteSetting("promo.lipaName") || "").trim();

  return (
    <ContentPage
      title="Reach Tanzanian job seekers with your vacancy."
      description={`One simple package: your vacancy on the DARAJA WhatsApp Channel (${followers} followers) and featured at the top of Daraja Ajira for ${days} days.`}
    >
      <h2>Featured job — TZS {price}</h2>
      <ul>
        <li>One post of your vacancy on the DARAJA WhatsApp Channel ({followers} followers, mostly in Tanzania).</li>
        <li>A Featured badge and top placement on Daraja Ajira for {days} days.</li>
        <li>A clear job page that sends candidates to your official application route.</li>
        <li>A short summary of channel views after 24 hours.</li>
      </ul>
      <p>
        A typical job post on the channel receives approximately 1,000–3,000 views in
        its first 24 hours, based on past channel insights. Views, clicks,
        applications and hires are different measures and none is guaranteed.
      </p>
      <p>
        <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
          See the DARAJA WhatsApp Channel
        </a>
      </p>

      <h2>How to book</h2>
      <ol>
        <li>
          Send us your vacancy details (job title, organisation, location, closing
          date and how to apply)
          {whatsappBooking ? (
            <>
              {" "}on{" "}
              <a href={whatsappBooking} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </>
          ) : null}{" "}
          or through our <Link href="/contact">contact page</Link>.
        </li>
        <li>We review the vacancy and confirm it meets our listing standards.</li>
        <li>
          {lipaNamba ? (
            <>
              Pay TZS {price} by M-Pesa to Lipa Namba <strong>{lipaNamba}</strong>
              {lipaName ? <> ({lipaName})</> : null} and send us the confirmation message.
            </>
          ) : (
            <>Pay TZS {price} using the payment details we send you, and share the confirmation.</>
          )}
        </li>
        <li>We publish your vacancy on the channel and feature it on Daraja Ajira.</li>
      </ol>
      <p>
        Pay only after we have confirmed your vacancy. Daraja will never ask you to
        pay a personal number that is different from the one shown on this page.
      </p>

      <h2>Our listing standards</h2>
      <p>
        We only promote genuine vacancies from identifiable employers with an official
        application route. We do not promote roles that charge candidates fees.
        Read our <Link href="/editorial-policy">job listing policy</Link>.
      </p>

      <h2>Important for candidates</h2>
      <p>
        DARAJA does not charge job seekers to view or apply for vacancies. Candidates
        apply through the employer&apos;s official application route.
      </p>
    </ContentPage>
  );
}
