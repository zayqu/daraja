import { JOB_CATEGORIES } from "./job-categories.js";

// Original Daraja introductions for each public job category. The category
// names come from lib/job-categories.js so there is one source of truth; this
// module only adds editorial guidance and a URL slug for each category.

export function sectorSlug(category) {
  return String(category || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const GUIDES = {
  Government: {
    intro: [
      "Government jobs in Tanzania cover ministries, regional and local government authorities, executive agencies, public universities and parastatal organisations. Most posts are recruited through the Public Service Recruitment Secretariat (PSRS) and the Ajira Portal, while some institutions advertise directly on their own websites.",
      "Public service recruitment is competitive and qualification-driven. Shortlisting usually checks minimum education, professional registration and experience strictly, followed by written and oral interviews.",
    ],
    tips: [
      "Keep a complete Ajira Portal profile with clear certificate uploads.",
      "Apply only where you meet the minimum qualification stated in the advert.",
      "Watch the PSRS website for interview calls after applying.",
    ],
    guides: ["how-to-apply-on-ajira-portal", "job-interview-preparation", "avoid-job-scams"],
  },
  "NGO & Development": {
    intro: [
      "NGO and development jobs include roles with local civil society organisations, international NGOs, UN agencies and donor-funded projects working in health, education, agriculture, governance, humanitarian response and more.",
      "Many positions are fixed-term or project-based and tied to funding cycles. Employers value field experience, report writing, monitoring and evaluation skills and the ability to work with communities and partners.",
    ],
    tips: [
      "Show measurable results from projects you supported, such as people reached or activities delivered.",
      "Highlight donor reporting, M&E or community engagement experience.",
      "Expect competency-based interviews and sometimes written tasks.",
    ],
    guides: ["write-a-cv-employers-read", "application-letter-guide", "understanding-job-adverts"],
  },
  "Banking & Finance": {
    intro: [
      "Banking and finance roles include branch and customer service positions, relationship management, credit, risk, compliance, treasury, operations and digital banking with commercial banks, microfinance institutions, insurers and fintech companies.",
      "Banks typically recruit through their own careers portals and run structured selection with aptitude tests, interviews and background checks. Integrity and attention to detail are essential in every role.",
    ],
    tips: [
      "Apply through the bank's official careers portal and never pay anyone for a bank job.",
      "Prepare for numerical and verbal aptitude tests.",
      "Mention relevant certifications and knowledge of compliance and customer service.",
    ],
    guides: ["write-a-cv-employers-read", "job-interview-preparation", "avoid-job-scams"],
  },
  Technology: {
    intro: [
      "Technology jobs span software development, IT support, networking, cybersecurity, data analysis and product roles in telecoms, banks, government agencies, startups and NGOs.",
      "Employers often care as much about what you can build or fix as about formal qualifications. A portfolio, GitHub profile or examples of systems you supported can make a strong difference.",
    ],
    tips: [
      "Link to a portfolio or code samples where appropriate.",
      "List specific tools and languages you have used in real projects.",
      "Expect practical or technical tests during selection.",
    ],
    guides: ["write-a-cv-employers-read", "first-job-after-graduation", "career-growth-while-employed"],
  },
  "Creative, Design & Media": {
    intro: [
      "Creative, design and media roles include graphic design, content creation, photography, video, journalism, communications and digital marketing with agencies, media houses, brands and organisations.",
      "Your portfolio is usually the deciding factor. Employers want to see quality, consistency and evidence that your work achieved its purpose.",
    ],
    tips: [
      "Share a focused portfolio of your best, most relevant work.",
      "Explain your role in each project and the result it achieved.",
      "Show familiarity with the tools and platforms named in the advert.",
    ],
    guides: ["write-a-cv-employers-read", "applying-for-jobs-by-email", "career-growth-while-employed"],
  },
  Health: {
    intro: [
      "Health jobs include doctors, nurses and midwives, clinical officers, pharmacists, laboratory scientists and public health roles in government facilities, faith-based and private hospitals, and health programmes run by NGOs.",
      "Most clinical roles require registration with the relevant professional council, and employers check it during shortlisting. Public health and programme roles also value data, reporting and community health experience.",
    ],
    tips: [
      "Keep your professional registration and practising licence current and ready to upload.",
      "State your cadre and registration details clearly on your CV.",
      "Government health posts are usually advertised through the Ajira Portal.",
    ],
    guides: ["documents-and-referees", "how-to-apply-on-ajira-portal", "job-interview-preparation"],
  },
  Education: {
    intro: [
      "Education jobs include teaching posts in public and private schools, tutors and lecturers in colleges and universities, early childhood education and education programme roles with NGOs.",
      "Public school teacher recruitment is usually announced by the government, while private schools and international schools often recruit directly and may ask for a demonstration lesson.",
    ],
    tips: [
      "Mention your teaching subjects and the levels you are qualified to teach.",
      "Prepare a short demonstration lesson for private school interviews.",
      "Keep teaching certificates and registration documents ready.",
    ],
    guides: ["application-letter-guide", "documents-and-referees", "job-interview-preparation"],
  },
  Engineering: {
    intro: [
      "Engineering roles cover civil, mechanical, electrical, telecommunications, water and other disciplines in construction, manufacturing, utilities, mining and public infrastructure projects.",
      "Many employers ask for registration with the Engineers Registration Board at the appropriate level, alongside site or project experience.",
    ],
    tips: [
      "State your discipline and registration status clearly.",
      "Describe projects with their scale, your role and the outcome.",
      "Graduate engineers can look for structured graduate engineer programmes.",
    ],
    guides: ["understanding-job-adverts", "first-job-after-graduation", "career-growth-while-employed"],
  },
  "Sales & Marketing": {
    intro: [
      "Sales and marketing roles include field sales, business development, key account management, brand management and digital marketing across consumer goods, telecoms, financial services and other industries.",
      "Employers look for evidence that you can meet targets, understand customers and communicate well in English and Swahili.",
    ],
    tips: [
      "Quantify results such as targets achieved, customers acquired or sales growth.",
      "Mention the territories and customer segments you know.",
      "Be ready to sell a product or idea during the interview.",
    ],
    guides: ["write-a-cv-employers-read", "job-interview-preparation", "applying-for-jobs-by-email"],
  },
  "Accounting & Audit": {
    intro: [
      "Accounting and audit roles include accountants, accounts assistants, auditors, tax specialists and finance officers in companies, audit firms, NGOs and public institutions.",
      "Professional qualifications recognised by the National Board of Accountants and Auditors (NBAA), such as CPA(T), are valued for many mid-level and senior roles.",
    ],
    tips: [
      "List the accounting software you have used and the reports you prepared.",
      "Mention professional examinations passed or in progress.",
      "Expect technical questions or tests on accounting and tax basics.",
    ],
    guides: ["write-a-cv-employers-read", "career-growth-while-employed", "documents-and-referees"],
  },
  "HR & Administration": {
    intro: [
      "HR and administration roles include human resources officers, recruitment, payroll, office administration, secretaries and executive assistants across all sectors.",
      "Employers value organisation, confidentiality, knowledge of employment procedures and strong written communication.",
    ],
    tips: [
      "Show experience with recruitment, payroll or records management.",
      "Highlight office software skills and attention to detail.",
      "Mention any HR professional training or certification.",
    ],
    guides: ["application-letter-guide", "write-a-cv-employers-read", "career-growth-while-employed"],
  },
  Legal: {
    intro: [
      "Legal roles include advocates, legal officers, company secretaries, compliance officers and paralegals with law firms, companies, NGOs and public institutions.",
      "Positions that involve practising law usually require admission to the roll of advocates and a current practising certificate.",
    ],
    tips: [
      "State your admission and practising status clearly.",
      "Describe the areas of law and types of matters you have handled.",
      "Expect writing samples or practical tests for some roles.",
    ],
    guides: ["application-letter-guide", "documents-and-referees", "job-interview-preparation"],
  },
  "Logistics & Transport": {
    intro: [
      "Logistics and transport roles include drivers, fleet managers, procurement and supply chain officers, warehouse staff, clearing and forwarding and shipping roles across ports, transport companies, NGOs and manufacturers.",
      "Driving roles require a valid licence of the right class, and supply chain roles often value professional procurement qualifications.",
    ],
    tips: [
      "State your licence class and years of driving experience where relevant.",
      "Mention inventory, procurement or clearing systems you have used.",
      "Show a record of safety and reliability.",
    ],
    guides: ["documents-and-referees", "understanding-job-adverts", "avoid-job-scams"],
  },
  "Hospitality & Tourism": {
    intro: [
      "Hospitality and tourism jobs include hotel and lodge roles, chefs, front office, housekeeping, tour guides and travel consultants, with many opportunities in Arusha, Zanzibar, Dar es Salaam and safari circuits.",
      "Employers look for strong customer service, presentation and language skills. Seasonal and contract roles are common.",
    ],
    tips: [
      "Highlight customer service experience and any foreign languages you speak.",
      "Mention hospitality training or certificates.",
      "Be wary of overseas hospitality offers that ask for upfront fees.",
    ],
    guides: ["avoid-job-scams", "applying-for-jobs-by-email", "job-interview-preparation"],
  },
  Agriculture: {
    intro: [
      "Agriculture jobs include agronomists, extension officers, livestock and fisheries specialists, farm managers and agribusiness roles with government, NGOs, research institutions and commercial farms.",
      "Field experience and practical knowledge of crops, livestock or value chains in Tanzania are highly valued.",
    ],
    tips: [
      "Describe the crops, livestock or value chains you have worked with.",
      "Mention field locations and the number of farmers you supported.",
      "Show data collection and reporting skills for project roles.",
    ],
    guides: ["understanding-job-adverts", "first-job-after-graduation", "write-a-cv-employers-read"],
  },
  "Mining, Energy, Oil & Gas": {
    intro: [
      "Mining, energy, oil and gas roles include geologists, mining and petroleum engineers, technicians, health and safety officers and support roles with mining companies, power producers and energy projects.",
      "Health, safety and environment awareness is central, and many roles are located on site with rotational schedules.",
    ],
    tips: [
      "Highlight safety training and certifications.",
      "State your experience with site work and rotational schedules.",
      "Confirm offers through official company channels only.",
    ],
    guides: ["avoid-job-scams", "documents-and-referees", "career-growth-while-employed"],
  },
  Manufacturing: {
    intro: [
      "Manufacturing roles include production supervisors, machine operators, quality control, maintenance technicians and plant management in food and beverage, construction materials, textiles and other factories.",
      "Employers value technical skill, safety awareness and experience with production targets and quality standards.",
    ],
    tips: [
      "Mention machines, processes and quality systems you have worked with.",
      "Show improvements you made to output, waste or safety.",
      "Keep technical certificates ready to share.",
    ],
    guides: ["write-a-cv-employers-read", "documents-and-referees", "job-interview-preparation"],
  },
  "Construction & Real Estate": {
    intro: [
      "Construction and real estate roles include site engineers, quantity surveyors, architects, foremen, project managers, property managers and real estate agents.",
      "Many professional roles require registration with the relevant board, and employers look for site experience and knowledge of project documentation.",
    ],
    tips: [
      "List projects with their type, value or size and your role.",
      "State your professional registration where relevant.",
      "Show familiarity with drawings, bills of quantities or site reporting.",
    ],
    guides: ["understanding-job-adverts", "documents-and-referees", "career-growth-while-employed"],
  },
  "Security & Protective Services": {
    intro: [
      "Security and protective services roles include security guards, supervisors, CCTV operators and security managers with private security firms, banks, NGOs and institutions.",
      "Employers look for reliability, discipline and integrity, and may run background checks.",
    ],
    tips: [
      "Mention security training and relevant certificates.",
      "Provide referees who can confirm your reliability.",
      "Never pay for recruitment, uniforms or training to get a job.",
    ],
    guides: ["avoid-job-scams", "documents-and-referees", "understanding-job-adverts"],
  },
  "Internships & Graduate Programs": {
    intro: [
      "Internships and graduate programmes are structured entry routes for students and recent graduates, offered by banks, telecoms, audit firms, NGOs, public institutions and growing companies.",
      "Selection usually focuses on academic performance, potential and attitude, with aptitude tests and interviews. Many programmes recruit once or twice a year, so apply as soon as they open.",
    ],
    tips: [
      "Include field attachments, volunteering and student leadership on your CV.",
      "Prepare for aptitude tests and competency interviews.",
      "Read eligibility rules on graduation year and age carefully.",
    ],
    guides: ["first-job-after-graduation", "write-a-cv-employers-read", "job-interview-preparation"],
  },
};

export const SECTOR_GUIDES = JOB_CATEGORIES.filter((category) => GUIDES[category]).map(
  (category) => ({
    category,
    slug: sectorSlug(category),
    ...GUIDES[category],
  })
);

export function findSectorGuide(slug) {
  return SECTOR_GUIDES.find((guide) => guide.slug === slug) || null;
}

export function sectorGuideForCategory(category) {
  return SECTOR_GUIDES.find((guide) => guide.category === category) || null;
}
