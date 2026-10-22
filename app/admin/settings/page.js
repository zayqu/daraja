import { PageHeader, Panel } from "@/components/admin/AdminUi";
import SettingField from "@/components/admin/SettingField";
import { requireAdminPage } from "@/lib/admin-guard";
import { SITE_SETTINGS } from "@/lib/features";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GROUPS = [
  { title: "Features", keys: ["feature.employerPortal", "feature.candidateCareer"] },
  { title: "Advertising", keys: ["ads.monetag"] },
  { title: "Email", keys: ["email.accountFrom"] },
  {
    title: "Review rules for scraped vacancies",
    note: "Built-in protections (fee scams, mis-read titles, messaging-only applications) always apply; these add to them.",
    keys: ["review.blockPhrases", "review.holdPhrases"],
  },
];

export default async function AdminSettingsPage() {
  await requireAdminPage("/admin/settings");
  const rows = await prisma.siteSetting.findMany();
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Switch site features on and off and set review rules. Changes apply within a minute. Passwords and API keys stay on the server and are never shown here."
      />
      {GROUPS.map((group) => (
        <Panel key={group.title} title={group.title}>
          {group.note ? <p style={{ marginTop: 0 }}>{group.note}</p> : null}
          {group.keys.map((key) => {
            const definition = SITE_SETTINGS[key];
            const isDefault = !Object.hasOwn(saved, key);
            return (
              <SettingField
                key={key}
                setting={{
                  key,
                  label: definition.label,
                  help: definition.help,
                  type: definition.type,
                  value: isDefault ? definition.env() : saved[key],
                  isDefault,
                }}
              />
            );
          })}
        </Panel>
      ))}
    </>
  );
}
