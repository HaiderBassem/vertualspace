# Members

People known in a world are its **members** (added by an administrator, by email) and **guests** (recorded when they
enter without having been added). Pages: `/o/{org}/w/{world}/members` (list, filters, add, CSV import and export) and
`/o/{org}/w/{world}/members/{id}` (details, tags, ban, GDPR export and erasure). Reading needs `member.read`, changes
need `member.manage` (moderators, admins, owners, and workspace managers for their worlds).

## Employee profiles

Each person of an organization can have an optional **employee profile**:

| Field         | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| Job title     | free text, up to 200 characters                                         |
| Department    | free text, up to 200 characters; the members list can be filtered by it |
| Manager       | another person of the same organization (by email)                      |
| Work location | free text, e.g. "Paris office" or "Remote"                              |

- **One profile per person and organization**, keyed by the person's email (case-insensitive): it is shared by the
  person's member rows in every world of the organization, and by their team account. People without an email
  (anonymous guests) have no profile. The same email in another organization has a separate profile.
- **Editing**: on the member page, "Employee profile", by people holding `member.manage` in that world. Everyone who
  can read members sees the profile and the read-only **Reports to** and **Direct reports** sections (with links to
  the member pages of the people who are in the same world).
- **Manager rules** (checked by the service, `src/lib/server/services/memberProfiles.ts`):
    - the manager must be a person of the same organization: a **member** (not a guest) of one of its worlds, or the
      account of an **active** member of its team;
    - nobody is their own manager;
    - a change that would close a reporting loop (the manager reports, directly or through a chain, to the person) is
      refused. Changes of reporting lines are serialized per organization (transaction advisory lock), so two concurrent
      changes cannot build a loop together.
- Emptying every field removes the profile (unless people still report to the person).
- **Audit**: every change writes `member.profile.update` with the names of the changed fields (not their values).
- **Members list**: Job title and Department columns, and a Department filter (departments in use in the
  organization).
- **GDPR**: the personal data export of a member includes the profile. Erasing a member deletes the profile once
  nothing of the person is left in the organization (no member row in any world, no team membership); their direct
  reports are then left without a manager.

### CSV

The export (`members/export?format=csv|json`) has the columns `identifier, kind, email, name, tags, visit_card_url,
chat_id, locale, visit_count, last_seen_at, created_at, job_title, department, manager_email, work_location`.

The import reads `email` (required), `name`, `tags` and, optionally, `job_title`, `department`, `manager_email` and
`work_location`, so an export can be imported back:

- a profile column **missing** from the file leaves that field unchanged; an **empty cell** clears it;
- profile columns are applied after the members, in file order, so a manager can be added by the same file;
- a line whose manager is refused (not a person of the organization, the person themself, or a loop) keeps its member
  row but none of its profile columns, and is reported with its line number; an invalid `manager_email` refuses the
  whole line.

## Tests

`tests/profiles.pure.test.ts` (loops, field rules, CSV columns) and `tests/profiles.db.test.ts` (manager rules,
concurrent changes, sharing across worlds and isolation between organizations, reporting lines, department filter,
CSV import and export, erasure).
