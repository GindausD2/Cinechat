import Link from "next/link";
import type { MovieCredit, Person } from "@prisma/client";
import { PrivacyImage } from "./privacy-image";
import { ScrollRegion } from "./scroll-region";

export function PersonPortrait({ person, large = false }: { person: Pick<Person, "name" | "portraitUrl" | "portraitLicenseUrl" | "portraitAttribution">; large?: boolean }) {
  return <div className={`person-portrait ${large ? "person-portrait-large" : ""}`}>
    {person.portraitUrl && person.portraitLicenseUrl && person.portraitAttribution
      ? <PrivacyImage src={person.portraitUrl} alt={`${person.name} portrait`} fill sizes={large ? "(max-width:700px) 120px, 220px" : "(max-width:700px) 148px, 168px"} />
      : <span aria-hidden="true">{person.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span>}
  </div>;
}
export function PeopleRail({ credits }: { credits: (MovieCredit & { person: Person })[] }) {
  const people = new Map<string, { person: Person; roles: string[] }>();
  for (const credit of credits) {
    const entry = people.get(credit.personSlug) || { person: credit.person, roles: [] };
    entry.roles.push(`${credit.job}${credit.characterName ? ` · ${credit.characterName}` : ""}`); people.set(credit.personSlug, entry);
  }
  return <ScrollRegion className="cast-rail" label="Cast and crew profiles">{[...people.values()].map(({ person, roles }) => <Link className="credit-card" href={`/people/${person.slug}`} key={person.slug}>
    <PersonPortrait person={person} /><h3>{person.name}</h3><p>{roles.join(" / ")}</p>
  </Link>)}</ScrollRegion>;
}
