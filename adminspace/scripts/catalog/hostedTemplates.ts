import type { ComponentManifest } from "../../src/lib/catalog/manifest";

/** Hosted scenery is referenced, never copied into the component pack. */
export const HOSTED_TEMPLATES: ComponentManifest[] = [
    {
        schema: "adminspace.component/1",
        key: "wa-village",
        version: "1.0.1",
        kind: "room_template",
        name: "WA Village",
        description:
            "Village scenery with a separate editable map for each world. Add furniture, areas and interactions without changing other worlds. The base scenery loads from its original host.",
        category: "templates",
        tags: ["village", "outdoor", "office"],
        license: "LicenseRef-100Roads",
        attribution:
            "WA Village scenery: 100 Roads Inc. Referenced from its original public host; not redistributed in this package.",
        provenance: {
            source: "third-party",
            author: "100 Roads Inc.",
            url: "https://github.com/workadventure/wa-village",
        },
        preview: "https://workadventure.github.io/wa-village/wa-headquarters.png",
        template: {
            map: "https://workadventure.github.io/wa-village/wa-headquarters.tmj",
            files: [],
            width: 200,
            height: 120,
            requires: ["desk-classic", "office-chair", "plant-small", "whiteboard", "meeting-table", "sofa"],
            entities: [],
            meetings: [
                { name: "Conference room", x: 208, y: 768, width: 928, height: 752 },
                { name: "Meeting room 1", x: 1488, y: 1456, width: 288, height: 224 },
                { name: "Meeting room 2", x: 1904, y: 1456, width: 288, height: 224 },
                { name: "Meeting room 3", x: 1488, y: 2064, width: 288, height: 224 },
                { name: "Meeting room 4", x: 1904, y: 2064, width: 288, height: 224 },
            ],
        },
        compatibility: { wam: "2.1.0" },
    },
];
