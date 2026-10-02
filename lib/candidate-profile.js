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
