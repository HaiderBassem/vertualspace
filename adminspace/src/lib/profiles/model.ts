/**
 * Employee profiles: job title, department, manager and work location of a person in an organization. Pure rules shared
 * by the service (src/lib/server/services/memberProfiles.ts), the CSV import and the tests.
 *
 * A profile belongs to the organization and is keyed by the person's email (lower case): the same person has one
 * profile across every world of the organization. The manager is another person of the same organization; a change
 * that would make someone their own manager, directly or through a chain of managers, is refused.
 */

export const PROFILE_TEXT_MAX = 200;
/** Longest reporting chain walked when checking a change (deeper chains are refused as cycles, defensively). */
export const MAX_REPORTING_DEPTH = 1000;

export type ProfileError = "managerNotFound" | "managerIsSelf" | "managerCycle" | "noEmail";

export interface ProfileInput {
    jobTitle: string | null;
    department: string | null;
    workLocation: string | null;
    /** Email of the manager, or null for none. */
    managerEmail: string | null;
}

/** Profile columns of one imported CSV line: only the columns present in the file are set (an empty cell clears). */
export type ImportedProfile = Partial<ProfileInput>;

/** Trims a free-text field; empty means "not set". Longer values are cut at PROFILE_TEXT_MAX. */
export function profileText(value: string | null | undefined): string | null {
    const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
    return trimmed ? trimmed.slice(0, PROFILE_TEXT_MAX) : null;
}

/** Profiles are keyed by the lower-case email. */
export function profileKey(email: string): string {
    return email.trim().toLowerCase();
}

export function normalizeProfileInput(
    input: Partial<Record<keyof ProfileInput, string | null | undefined>>,
): ProfileInput {
    const manager = (input.managerEmail ?? "").trim();
    return {
        jobTitle: profileText(input.jobTitle),
        department: profileText(input.department),
        workLocation: profileText(input.workLocation),
        managerEmail: manager ? profileKey(manager) : null,
    };
}

/**
 * Would giving `subject` the manager `manager` close a loop? True when the manager is the subject, or when walking up
 * from the manager (their manager, then theirs...) reaches the subject. `managerOf` gives each person's current manager
 * (null or undefined: none). A chain longer than MAX_REPORTING_DEPTH, or a loop already present above the manager, is
 * treated as a cycle: the change is refused rather than making things worse.
 */
export function wouldCreateCycle(
    subject: string,
    manager: string | null,
    managerOf: (person: string) => string | null | undefined,
): boolean {
    if (manager === null) return false;
    if (manager === subject) return true;
    const seen = new Set<string>([manager]);
    let current: string | null | undefined = managerOf(manager);
    for (let depth = 0; current; depth++) {
        if (current === subject || seen.has(current) || depth >= MAX_REPORTING_DEPTH) return true;
        seen.add(current);
        current = managerOf(current);
    }
    return false;
}

/** The manager problem of a change, if any (the manager's existence is checked by the caller). */
export function managerProblem(
    subject: string,
    manager: string | null,
    managerOf: (person: string) => string | null | undefined,
): Extract<ProfileError, "managerIsSelf" | "managerCycle"> | undefined {
    if (manager === null) return undefined;
    if (manager === subject) return "managerIsSelf";
    return wouldCreateCycle(subject, manager, managerOf) ? "managerCycle" : undefined;
}

/** Fields that changed between two profiles (for the audit log: names of fields only, never values). */
export function changedProfileFields(before: ProfileInput, after: ProfileInput): (keyof ProfileInput)[] {
    return (Object.keys(after) as (keyof ProfileInput)[]).filter((key) => before[key] !== after[key]);
}

export const EMPTY_PROFILE: ProfileInput = { jobTitle: null, department: null, workLocation: null, managerEmail: null };

export function isEmptyProfile(profile: ProfileInput): boolean {
    return (
        profile.jobTitle === null &&
        profile.department === null &&
        profile.workLocation === null &&
        profile.managerEmail === null
    );
}
