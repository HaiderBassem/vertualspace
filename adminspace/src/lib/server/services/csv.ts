/**
 * CSV (RFC 4180) writing and reading, without dependencies.
 *
 * - Output: UTF-8, CRLF line endings, fields quoted when they contain a comma, a quote or a line break.
 * - Cells starting with = + - @ (or a tab / carriage return) are prefixed with an apostrophe so that
 *   spreadsheets do not run them as formulas (OWASP "CSV injection").
 * - Input: quoted fields with escaped quotes ("") and embedded line breaks, CRLF or LF, optional BOM.
 */

import { profileText, type ImportedProfile } from "../../profiles/model";

const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) return "";
    let text = String(value);
    if (typeof value === "string" && FORMULA_START.test(text)) {
        text = `'${text}`;
    }
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}

/** Parses CSV text into rows of cells. Empty lines are skipped. */
export function parseCsv(text: string): string[][] {
    const input = text.startsWith("\uFEFF") ? text.slice(1) : text;
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    let i = 0;

    const endRow = () => {
        row.push(cell);
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        cell = "";
    };

    while (i < input.length) {
        const char = input[i];
        if (quoted) {
            if (char === '"') {
                if (input[i + 1] === '"') {
                    cell += '"';
                    i += 2;
                    continue;
                }
                quoted = false;
                i++;
                continue;
            }
            cell += char;
            i++;
            continue;
        }
        if (char === '"' && cell === "") {
            quoted = true;
        } else if (char === ",") {
            row.push(cell);
            cell = "";
        } else if (char === "\r") {
            if (input[i + 1] === "\n") i++;
            endRow();
        } else if (char === "\n") {
            endRow();
        } else {
            cell += char;
        }
        i++;
    }
    if (cell !== "" || row.length > 0) endRow();
    return rows;
}

// ---------------------------------------------------------------------------------------------
// Member import
// ---------------------------------------------------------------------------------------------

export const IMPORT_MAX_ROWS = 5000;
export const IMPORT_MAX_BYTES = 1_000_000;

export type ImportErrorCode =
    | "invalidEmail"
    | "missingEmail"
    | "missingHeader"
    | "tooManyRows"
    | "emptyFile"
    | "duplicateEmail"
    | "invalidTag"
    | "reservedTag"
    | "unknownTag"
    | "managerNotFound"
    | "managerIsSelf"
    | "managerCycle"
    | "invalidManagerEmail";

/** Tag names travel comma-separated in WorkAdventure URLs: no comma, 1 to 64 characters (as TAG_NAME_PATTERN). */
const TAG_NAME = /^[^,\s](?:[^,]{0,62}[^,\s])?$/;

export interface ImportRow {
    line: number;
    email: string;
    name: string | undefined;
    tags: string[];
    /**
     * Employee profile columns present in the file (job_title, department, manager_email, work_location); absent when
     * the file has none of them. A column missing from the file leaves the field as it is; an empty cell clears it.
     */
    profile?: ImportedProfile;
}

/** Header names of the employee profile columns, as the export writes them. */
export const PROFILE_COLUMNS = {
    jobTitle: "job_title",
    department: "department",
    managerEmail: "manager_email",
    workLocation: "work_location",
} as const satisfies Record<keyof ImportedProfile, string>;

export interface ParsedImport {
    rows: ImportRow[];
    errors: { line: number; code: ImportErrorCode }[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits a tags cell: "a;b", "a|b" or "a,b" (when the cell was quoted). Empty items are dropped. */
export function splitTags(cell: string | undefined): string[] {
    return [
        ...new Set(
            (cell ?? "")
                .split(/[;|,]/)
                .map((t) => t.trim())
                .filter((t) => t.length > 0),
        ),
    ];
}

/**
 * Reads a members CSV with a header row containing at least "email" (and optionally "name", "tags", and the employee
 * profile columns of PROFILE_COLUMNS).
 */
export function parseMemberImport(text: string): ParsedImport {
    const table = parseCsv(text);
    const [header, ...body] = table;
    if (!header) return { rows: [], errors: [{ line: 1, code: "emptyFile" }] };
    const columns = header.map((h) => h.trim().toLowerCase());
    const emailIndex = columns.indexOf("email");
    if (emailIndex === -1) return { rows: [], errors: [{ line: 1, code: "missingHeader" }] };
    if (body.length > IMPORT_MAX_ROWS) return { rows: [], errors: [{ line: 1, code: "tooManyRows" }] };
    const nameIndex = columns.indexOf("name");
    const tagsIndex = columns.indexOf("tags");
    const profileIndexes = (Object.entries(PROFILE_COLUMNS) as [keyof ImportedProfile, string][])
        .map(([field, column]) => [field, columns.indexOf(column)] as const)
        .filter(([, index]) => index >= 0);

    const rows: ImportRow[] = [];
    const errors: ParsedImport["errors"] = [];
    const seen = new Set<string>();
    body.forEach((cells, index) => {
        const line = index + 2;
        const email = (cells[emailIndex] ?? "").trim();
        if (!email) {
            errors.push({ line, code: "missingEmail" });
            return;
        }
        if (!EMAIL.test(email) || email.length > 320) {
            errors.push({ line, code: "invalidEmail" });
            return;
        }
        // The same person twice in one file: the first line wins, the next ones are reported.
        if (seen.has(email.toLowerCase())) {
            errors.push({ line, code: "duplicateEmail" });
            return;
        }
        const tags = tagsIndex >= 0 ? splitTags(cells[tagsIndex]) : [];
        if (tags.some((tag) => !TAG_NAME.test(tag))) {
            errors.push({ line, code: "invalidTag" });
            return;
        }
        let profile: ImportedProfile | undefined;
        if (profileIndexes.length > 0) {
            profile = {};
            for (const [field, index] of profileIndexes) {
                const cell = (cells[index] ?? "").trim();
                if (field === "managerEmail") {
                    if (cell && (!EMAIL.test(cell) || cell.length > 320)) {
                        errors.push({ line, code: "invalidManagerEmail" });
                        return;
                    }
                    profile.managerEmail = cell ? cell.toLowerCase() : null;
                } else {
                    profile[field] = profileText(cell);
                }
            }
        }
        seen.add(email.toLowerCase());
        const name = nameIndex >= 0 ? (cells[nameIndex] ?? "").trim().slice(0, 200) : "";
        rows.push({ line, email, name: name || undefined, tags, ...(profile ? { profile } : {}) });
    });
    return { rows, errors };
}

/** RFC 6266 Content-Disposition for a download, with an RFC 8187 UTF-8 filename. */
export function attachmentHeader(filename: string): string {
    const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
