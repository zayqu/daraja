import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { Badge, EmptyState, Notice, Panel, formatDate } from "@/components/dashboard/DashboardUi";
import NavIcon from "@/components/ui/NavIcon";
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

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "D").slice(0, 2).toUpperCase();
}

function period(item) {
  const end = item.current ? "Present" : item.endDate;
  return [item.startDate, end].filter(Boolean).join(" – ");
}

// The candidate's Profile (Figma Desktop · Profile): a header card with who
// they are, then their experience (left) and skills and CV versions (right),
// all from their own Master CV. Editing happens on /account/profile/edit and
// in the CV Builder; the gear menu also leads to Account settings.
export default async function CandidateProfilePage() {
  if (!candidateCareerEnabled()) notFound();
  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/profile");

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
      <section className={dash.profileHero} aria-label="Your profile">
        <div className={dash.profileCover} aria-hidden="true" />
        <div className={dash.profileBody}>
          <span className={dash.profileAvatar} aria-hidden="true">{initialsOf(name)}</span>
          <div className={dash.profileText}>
            <h1>{name}</h1>
            {profile?.headline ? <p>{profile.headline}</p> : null}
            <ul className={dash.profileFacts}>
              {profile?.location ? (
                <li><NavIcon name="location" size={16} />{profile.location}</li>
              ) : null}
              <li><NavIcon name="mail" size={16} />{user.email}</li>
            </ul>
          </div>
          <div className={dash.profileActions}>
            <Link className={dash.button} href="/account/profile/edit">
              <NavIcon name="edit" size={16} />
              Edit profile
            </Link>
            <ProfileMenu
              items={[
                { href: "/account/profile/edit", label: "Edit profile", icon: "user" },
                { href: "/account/settings", label: "Account settings", icon: "settings" },
              ]}
            />
          </div>
        </div>
      </section>

      {progress.complete < progress.total ? (
        <Notice
          tone="warning"
          title={`Your profile is ${progress.complete} of ${progress.total} complete`}
          action={<Link className={dash.linkArrow} href="/account/profile/edit">Complete →</Link>}
        >
          A complete profile fills your CV for you and helps employers understand you when you apply.
        </Notice>
      ) : null}

      <div className={dash.profileGrid}>
        <Panel title="Work experience" actions={content.experience.length ? <Link className={dash.linkArrow} href="/account/career/cv">Open CV Builder</Link> : null}>
          {content.experience.length ? (
            <ul className={dash.experienceList}>
              {content.experience.map((item, index) => (
                <li key={`${item.role}-${index}`}>
                  <span className={dash.experienceMark} aria-hidden="true">{initialsOf(item.role || item.employer)}</span>
                  <div>
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
                  </div>
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

        <div className={dash.profileSide}>
          <Panel title="Skills">
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

          <Panel
            title="My CVs"
            actions={<Link className={dash.buttonPrimary} href="/account/career/cv">New CV</Link>}
          >
            {cvs.length ? (
              <ul className={dash.cvList}>
                {cvs.map((cv) => (
                  <li key={cv.id}>
                    <NavIcon name="document" size={20} />
                    <Link href="/account/career/cv">
                      <strong>{cv.name}</strong>
                      <span>Updated {formatDate(cv.updatedAt)}</span>
                    </Link>
                    <Badge tone={cv.atsScore >= 70 ? "green" : "amber"}>ATS {cv.atsScore}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No CVs yet" text="Build an ATS-ready CV from your profile, then tailor a copy for each job." action={cvBuilder} />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
