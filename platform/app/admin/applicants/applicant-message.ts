import { waDigits } from "../format";

/**
 * Resolves the appropriate Nigerian time-of-day greeting:
 * - 04:00 - 11:59: "Good morning"
 * - 12:00 - 16:59: "Good afternoon"
 * - 17:00 - 03:59: "Good evening"
 */
export function getTimeOfDayGreeting(date = new Date()): string {
  try {
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      hour12: false,
    }).format(date);
    const hour = parseInt(hourStr, 10);
    if (hour >= 4 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  } catch {
    const hour = date.getHours();
    if (hour >= 4 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  }
}

/**
 * Pre-formatted outreach message sent to candidates who pass the initial screening.
 * Blueprint §6.1 / Cleanse Pro Onboarding workflow.
 */
export function getApplicantSelectionMessage(
  fullName: string,
  greetingOverride?: string
): string {
  const name = fullName ? fullName.trim() : "";
  const timeGreeting = greetingOverride || getTimeOfDayGreeting();
  const greeting = name
    ? `${timeGreeting} ${name}, this is the General Operations Manager at Cleanse.ng. I am reaching out to you directly regarding the application you submitted on our website.`
    : `${timeGreeting}, this is the General Operations Manager at Cleanse.ng. I am reaching out to you directly regarding the application you submitted on our website.`;

  return `${greeting}

Cleanse.ng is a home cleaning company in Ibadan. We send trained, trusted people to clean homes, so families don't have to worry about cleaners who don't show up. We also want cleaning to be respected work that pays fairly.

You recently filled our online form to join us as a Cleanse Pro. We had many applications, and you were selected to go further. That is a privilege, and we are glad to have you.

Before we continue, we want to explain how the work and the pay work:

- You are paid for every job you do, not a monthly salary.
- Pay per job depends on the size of the home. For example, a 2-bedroom pays differently from a 3-bedroom.
- The more jobs you do, the more you earn. This is how our flyer's ₦90,000 a month can be reached, depending on the number and size of the jobs you do.
- We give you the jobs and tell you which days you will work.
- You will work in Bodija, Oluyole, Jericho, Akobo and other high-value areas of Ibadan, the same areas listed on our website.
- We provide all the cleaning equipment you will use.
- We do not cover transport, so please make sure you can get to these areas.

If this works for you, reply YES. We will book a time for you to come and meet us in person. At the meeting we will explain everything properly and give you the equipment you will use, so you are ready to start.

If this is not for you, no wahala. Thank you for your time.

Cleanse.ng`;
}

/**
 * Builds a direct wa.me link with the prefilled message targeted to the applicant's WhatsApp number.
 */
export function buildApplicantWhatsAppUrl(
  phone: string,
  fullName: string,
  greetingOverride?: string
): string {
  let digits = waDigits(phone);
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "234" + digits.slice(1);
  }
  const text = getApplicantSelectionMessage(fullName, greetingOverride);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
