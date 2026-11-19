export const candidateProfileSelect = {
  id: true,
  fullName: true,
  phone: true,
  headline: true,
  location: true,
  experienceLevel: true,
  workArrangement: true,
  portfolioUrl: true,
  createdAt: true,
  updatedAt: true,
};

export const emptyCandidateProfile = {
  fullName: "",
  phone: "",
  headline: "",
  location: "",
  experienceLevel: "",
  workArrangement: "",
  portfolioUrl: "",
};

export function candidateProfileFormValue(profile) {
  return {
    fullName: profile?.fullName || "",
    phone: profile?.phone || "",
    headline: profile?.headline || "",
    location: profile?.location || "",
    experienceLevel: profile?.experienceLevel || "",
    workArrangement: profile?.workArrangement || "",
    portfolioUrl: profile?.portfolioUrl || "",
  };
}

// The six profile facts the dashboard counts towards "profile complete".
export function profileProgress(profile) {
  const fields = [
    profile?.fullName,
    profile?.phone,
    profile?.headline,
    profile?.location,
    profile?.experienceLevel,
    profile?.workArrangement,
  ];
  return { complete: fields.filter(Boolean).length, total: fields.length };
}

// How a candidate sees each Daraja-managed application status.
export const APPLICATION_STATES = {
  PENDING: { label: "Sent", tone: "blue", group: "review" },
  REVIEWED: { label: "In review", tone: "amber", group: "review" },
  SHORTLISTED: { label: "Shortlisted", tone: "green", group: "shortlisted" },
  OFFERED: { label: "Offer", tone: "green", group: "shortlisted" },
  REJECTED: { label: "Not selected", tone: "red", group: "closed" },
  WITHDRAWN: { label: "Withdrawn", tone: "gray", group: "withdrawn" },
};

export function applicationState(status) {
  return APPLICATION_STATES[status] || { label: status, tone: "gray", group: "review" };
}
