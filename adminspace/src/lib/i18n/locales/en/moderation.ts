import type { PluralMessage } from "../../index";

const p = (forms: PluralMessage): PluralMessage => forms;

/** Bans and user reports. */
export const moderation = {
    title: "Moderation",
    tabs: {
        bans: "Bans",
        reports: "Reports",
    },
    bans: {
        description:
            "Banned people cannot enter any room of this world. Bans come from administrators in WorkAdventure (people holding the admin tag) or from this back office.",
        filterActive: "Active",
        filterAll: "All, including lifted and expired",
        empty: "No ban.",
        columns: {
            person: "Person",
            ipAddress: "IP address",
            reason: "Reason",
            by: "Banned by",
            since: "Since",
            until: "Until",
            status: "Status",
        },
        bannedByLine: "Banned by: {name}",
        status: {
            active: "Active",
            revoked: "Lifted",
            expired: "Expired",
        },
        permanent: "Permanent",
        fromBackOffice: "Back office",
        create: "Ban someone",
        target: "Person",
        targetHelp: "WorkAdventure identifier or email address of the person.",
        ipAddress: "IP address",
        ipAddressHelp: "Optional. Also bans this address (IPv4 or IPv6), so that another identity cannot be used.",
        invalidIp: "Enter a valid IPv4 or IPv6 address.",
        targetRequired: "Give an identifier or an IP address.",
        reason: "Reason",
        reasonHelp: "Shown to the banned person.",
        duration: "Duration",
        durations: {
            permanent: "Permanent",
            hour: "1 hour",
            day: "24 hours",
            week: "7 days",
            month: "30 days",
        },
        created: "Ban recorded.",
        createdAndKicked: "Ban recorded, and the person was disconnected from WorkAdventure.",
        revoke: "Lift",
        revokeTitle: "Lift this ban?",
        revokeDescription: "The person can enter the world again.",
        revoked: "Ban lifted.",
    },
    reports: {
        description:
            'Reports sent by people from inside WorkAdventure ("Report this user"). Review them, then resolve or dismiss them.',
        empty: "No report.",
        filters: {
            open: "Open",
            resolved: "Resolved",
            dismissed: "Dismissed",
            all: "All",
        },
        status: {
            open: "Open",
            resolved: "Resolved",
            dismissed: "Dismissed",
        },
        count: p({ zero: "No report", one: "{count} report", other: "{count} reports" }),
        reported: "Reported person",
        reporter: "Reported by",
        room: "Room",
        comment: "Comment",
        note: "Resolution note",
        noteHelp: "Optional, visible to the administrators of the world only.",
        noteLabel: "Resolution note:",
        resolve: "Resolve",
        dismiss: "Dismiss",
        reopen: "Reopen",
        handledBy: "Handled {date}",
        updated: "Report updated.",
        banReported: "Ban the reported person",
        banReportedTitle: "Ban the reported person?",
        banReportedDescription: "They will not be able to enter this world anymore, and the report will be resolved.",
        banReason: "Reported by another person: {comment}",
    },
    liveDisconnect: {
        banSaved: "Ban saved. Immediate disconnection: {outcome}",
        banSavedOnly: "Ban saved.",
        outcomes: {
            sent: "requested from WorkAdventure.",
            notConfigured:
                "not available, because the live connection to WorkAdventure is not configured. The person will be refused at their next connection.",
            unreachable:
                "failed, because WorkAdventure could not be reached. The person will be refused at their next connection.",
            rejected:
                "refused by WorkAdventure (check ADMIN_SOCKETS_TOKEN). The person will be refused at their next connection.",
            notApplicable:
                "not possible for a ban of an IP address alone. The address will be refused at its next connection.",
        },
    },
};
