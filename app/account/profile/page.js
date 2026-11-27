import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { Badge, EmptyState, ListRow, ListRows, Notice, PageHeader, Panel, formatDate } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { candidateProfileSelect, profileProgress } from "@/lib/candidate-profile";
import { normalizeCvContent } from "@/lib/cv-builder";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Profile",
  description: "Your Daraja candidate profile: experience, skills and CVs.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TABS = [
  ["experience", "Experience"],
  ["skills", "Skills"],
  ["cvs", "CVs"],
];

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "D").slice(0, 2).toUpperCase();
}

function period(item) {
  const end = item.current ? "Present" : item.endDate;
  return [item.startDate, end].filter(Boolean).join(" – ");
}

// The candidate's Profile tab (Makarya pattern, D-038): who they are, then their
// experience and skills from the Master CV, and their CV versions. Editing
// happens on /account/profile/edit and in the CV Builder; the gear menu also
// leads to Account settings.
export default async function CandidateProfilePage({ searchParams }) {
  if (!candidateCareerEnabled()) notFound();
  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/profile");

  const params = await searchParams;
  const tab = TABS.some(([key]) => key === params?.tab) ? params.tab : "experience";
  const profile = await prisma.jobSeeker.findUnique({
    where: { userId: user.id },
    select: candidateProfileSelect,
  });
  const cvs = profile
    ? await prisma.candidateCv.findMany({
        where: { jobSeekerId: profile.id },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: { id: true, name: true, kind: true, atsScore: true, updatedAt: true, content: true },
      })
    : [];
  const master = cvs.find((cv) => cv.kind === "MASTER") || cvs[0] || null;
  const content = master ? normalizeCvContent(master.content) : { experience: [], skills: [] };
  const name = profile?.fullName || user.name || user.email.split("@")[0];
  const progress = profileProgress(profile);
  const cvBuilder = <Link className={dash.button} href="/account/career/cv">Open CV Builder</Link>;

  return (
    <>
      <PageHeader
        title="Profile"
        actions={
          <ProfileMenu
            items={[
              { href: "/account/profile/edit", label: "Edit profile", icon: "user" },
              { href: "/account/settings", label: "Account settings", icon: "settings" },
            ]}
          />
        }
      />

      <section className={dash.identity} aria-label="Your profile">
        <span className={dash.identityAvatar} aria-hidden="true">{initialsOf(name)}</span>
        <h2>{name}</h2>
        {profile?.headline ? <p>{profile.headline}</p> : null}
        {profile?.location ? <small>{profile.location}</small> : null}
      </section>

      {progress.complete < progress.total ? (
        <Notice
          tone="info"
          title={`Your profile is ${progress.complete} of ${progress.total} complete`}
          action={<Link className={dash.linkArrow} href="/account/profile/edit">Complete your profile →</Link>}
        >
          A complete profile fills your CV for you and helps employers understand you when you apply.
        </Notice>
      ) : null}

      <nav className={dash.underlineTabs} aria-label="Profile sections">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/account/profile?tab=${key}`}
            className={tab === key ? dash.tabCurrent : undefined}
            aria-current={tab === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "experience" ? (
        <Panel title="Work experience" actions={content.experience.length ? cvBuilder : null}>
          {content.experience.length ? (
            <ul className={dash.experienceList}>
              {content.experience.map((item, index) => (
                <li key={`${item.role}-${index}`}>
                  <div className={dash.experienceHead}>
                    <strong>{item.role || "Role"}</strong>
                    <span>{period(item)}</span>
                  </div>
                  <span className={dash.experienceMeta}>
                    {[item.employer, item.location].filter(Boolean).join(" · ")}
                  </span>
                  {item.bullets.length ? (
                    <ul>
                      {item.bullets.slice(0, 3).map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No work experience yet"
              text="Add your experience once in the CV Builder; it shows here and in every CV you make."
              action={cvBuilder}
            />
          )}
        </Panel>
      ) : null}

      {tab === "skills" ? (
        <Panel title="Skills" actions={content.skills.length ? cvBuilder : null}>
          {content.skills.length ? (
            <div className={dash.skillPills}>
              {content.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No skills yet"
              text="Add 6 to 12 skills in the CV Builder so employers can see what you do best."
              action={cvBuilder}
            />
          )}
        </Panel>
      ) : null}

      {tab === "cvs" ? (
        <Panel
          title={`${cvs.length} CV${cvs.length === 1 ? "" : "s"}`}
          actions={<Link className={dash.buttonPrimary} href="/account/career/cv">New CV</Link>}
        >
          {cvs.length ? (
            <ListRows>
              {cvs.map((cv) => (
                <ListRow
                  key={cv.id}
                  title={cv.name}
                  href="/account/career/cv"
                  subtitle={cv.kind === "MASTER" ? "Master CV" : "Tailored CV"}
                  meta={[`Updated ${formatDate(cv.updatedAt)}`]}
                  badge={<Badge tone={cv.atsScore >= 70 ? "green" : "amber"}>ATS {cv.atsScore}</Badge>}
                />
              ))}
            </ListRows>
          ) : (
            <EmptyState title="No CVs yet" text="Build an ATS-ready CV from your profile, then tailor a copy for each job." action={cvBuilder} />
          )}
        </Panel>
      ) : null}
    </>
  );
}
