export interface AgreementClause {
  id: number;
  group: string;
  text: string;
}

export const AGREEMENT_VERSION = "v1.0";
export const NOTICE_DAYS = 5;

export const AGREEMENT_CLAUSES: AgreementClause[] = [
  // Pay and work
  {
    id: 1,
    group: "Pay and work",
    text: "I understand I am paid per job, not monthly. Pay depends on the size of the home, and the number of jobs is not guaranteed.",
  },
  {
    id: 2,
    group: "Pay and work",
    text: "Cleanse assigns my jobs and my days, and I will show up on time.",
  },
  {
    id: 3,
    group: "Pay and work",
    text: "If I can't make a job, I will tell my supervisor early so a replacement can be found.",
  },
  {
    id: 4,
    group: "Pay and work",
    text: "I will work with a partner on jobs and treat them with respect.",
  },

  // Equipment and transport
  {
    id: 5,
    group: "Equipment and transport",
    text: "Cleanse provides the equipment. I will take good care of it and return it if I stop working with Cleanse.",
  },
  {
    id: 6,
    group: "Equipment and transport",
    text: "I am responsible for my own transport to jobs.",
  },

  // Conduct in clients' homes
  {
    id: 7,
    group: "Conduct in clients' homes",
    text: "I will not take, use or touch anything that is not part of the cleaning, including phones and personal items.",
  },
  {
    id: 8,
    group: "Conduct in clients' homes",
    text: "I will not share photos or details of any client's home with anyone.",
  },
  {
    id: 9,
    group: "Conduct in clients' homes",
    text: "I will not bring visitors to a job.",
  },
  {
    id: 10,
    group: "Conduct in clients' homes",
    text: "I will not make private deals with clients or take payment outside Cleanse. All jobs go through Cleanse.",
  },
  {
    id: 11,
    group: "Conduct in clients' homes",
    text: "I will not come to a job under the influence of alcohol or drugs.",
  },

  // Honesty and safety
  {
    id: 12,
    group: "Honesty and safety",
    text: "If I break something or have an accident, I will report it right away and not hide it.",
  },
  {
    id: 13,
    group: "Honesty and safety",
    text: "If a place feels unsafe, I can leave and call my supervisor.",
  },

  // Checks and consent
  {
    id: 14,
    group: "Checks and consent",
    text: "Cleanse may check my NIN and call my guarantor, and my guarantor has agreed to be contacted.",
  },
  {
    id: 15,
    group: "Checks and consent",
    text: "If I gave false information, Cleanse can remove me.",
  },
  {
    id: 16,
    group: "Checks and consent",
    text: "I agree to attend the in-person meeting and training.",
  },
  {
    id: 17,
    group: "Checks and consent",
    text: "I agree to Cleanse.ng keeping my details and photo for recruitment records.",
  },

  // Ending the work
  {
    id: 18,
    group: "Ending the work",
    text: `Either side can stop working together by giving ${NOTICE_DAYS} days' notice. Cleanse can stop immediately if there is theft or serious misconduct.`,
  },
  {
    id: 19,
    group: "Ending the work",
    text: "I confirm everything I have written is true.",
  },
];

