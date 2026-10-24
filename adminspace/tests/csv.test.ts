import { describe, expect, it } from "vitest";
import {
    attachmentHeader,
    escapeCsvCell,
    parseCsv,
    parseMemberImport,
    splitTags,
    toCsv,
} from "../src/lib/server/services/csv";

describe("CSV writing (RFC 4180)", () => {
    it("quotes fields with commas, quotes and line breaks, and ends lines with CRLF", () => {
        expect(
            toCsv(
                ["a", "b"],
                [
                    ["x,y", 'say "hi"'],
                    ["line\nbreak", null],
                ],
            ),
        ).toBe('a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",\r\n');
    });

    it("neutralizes spreadsheet formulas (CSV injection)", () => {
        expect(escapeCsvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
        expect(escapeCsvCell("+33")).toBe("'+33");
        expect(escapeCsvCell("-1")).toBe("'-1");
        expect(escapeCsvCell("@user")).toBe("'@user");
        expect(escapeCsvCell(-1)).toBe("-1");
    });

    it("round-trips through the parser", () => {
        const rows = [["é, ü", 'q"q', "multi\r\nline"]];
        expect(parseCsv(toCsv(["h1", "h2", "h3"], rows))).toEqual([["h1", "h2", "h3"], ...rows]);
    });
});

describe("CSV reading", () => {
    it("accepts LF and CRLF, a BOM, and skips empty lines", () => {
        expect(parseCsv("﻿a,b\n1,2\r\n\r\n3,4")).toEqual([
            ["a", "b"],
            ["1", "2"],
            ["3", "4"],
        ]);
    });

    it("keeps empty cells", () => {
        expect(parseCsv("a,,c\n,,")).toEqual([
            ["a", "", "c"],
            ["", "", ""],
        ]);
    });
});

describe("member import", () => {
    it("reads email, name and tags in any column order and case", () => {
        const result = parseMemberImport(
            'Name,EMAIL,Tags\nAda,ada@example.com,"admin, editor"\n,bob@example.com,vip;x|y\n',
        );
        expect(result.errors).toEqual([]);
        expect(result.rows).toEqual([
            { line: 2, email: "ada@example.com", name: "Ada", tags: ["admin", "editor"] },
            { line: 3, email: "bob@example.com", name: undefined, tags: ["vip", "x", "y"] },
        ]);
    });

    it("reports invalid rows with their line number", () => {
        const result = parseMemberImport("email\nnot-an-email\n,\nok@example.com");
        expect(result.rows.map((r) => r.email)).toEqual(["ok@example.com"]);
        expect(result.errors).toEqual([
            { line: 2, code: "invalidEmail" },
            { line: 3, code: "missingEmail" },
        ]);
    });

    it("requires an email column", () => {
        expect(parseMemberImport("name\nAda").errors).toEqual([{ line: 1, code: "missingHeader" }]);
        expect(parseMemberImport("").errors).toEqual([{ line: 1, code: "emptyFile" }]);
    });

    it("deduplicates tags", () => {
        expect(splitTags("a; a |b")).toEqual(["a", "b"]);
    });
});

describe("downloads", () => {
    it("builds an RFC 6266 Content-Disposition with a UTF-8 file name", () => {
        expect(attachmentHeader("membres-été.csv")).toBe(
            "attachment; filename=\"membres-_t_.csv\"; filename*=UTF-8''membres-%C3%A9t%C3%A9.csv",
        );
    });
});
