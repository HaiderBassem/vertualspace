/** Room API keys and custom domains of an organization. */
export const integrations = {
    apiKeysTitle: "Room API keys",
    apiKeysIntro:
        "Keys let your own software use WorkAdventure's Room API (variables and events of rooms) in the worlds of this organization.",
    apiKeysUsage:
        "Send the key in the X-API-Key header of Room API calls. WorkAdventure checks it with this admin on every call.",
    apiKeysEmpty: "No key yet.",
    newKey: "New key",
    keyName: "Name",
    keyNameHelp: "What the key is for, e.g. the name of the software using it.",
    scope: "Scope",
    scopeAll: "Every world of the organization",
    expiresAt: "Expiry date",
    expiresHelp: "Leave empty for a key that does not expire. The key stops working at the end of this day (UTC).",
    createKey: "Create the key",
    keyCreated: "Copy this key now: it will never be shown again.",
    key: "Key",
    lastUsed: "Last used",
    keyStatus: {
        active: "Active",
        revoked: "Revoked",
        expired: "Expired",
    },
    revokeTitle: "Revoke this key?",
    revokeDescription: "Software using it immediately loses access to the Room API.",
    keyRevoked: "Key revoked.",

    domainsTitle: "Domains",
    domainsIntro: "Custom domains on which WorkAdventure is served for this organization.",
    domainsHowItWorks:
        "WorkAdventure asks this admin whether a domain is legitimate before redirecting people after an OpenID Connect login (GET /api/domain/verify), and fetches the challenge token of a domain when a certificate is issued for it (GET /white-label/cf-challenge).",
    domainsEmpty: "No custom domain yet.",
    host: "Domain name",
    hostHelp: "For example play.example.com. International domain names are accepted.",
    addDomain: "Add the domain",
    invalidHost: "Enter a valid domain name, without https:// nor path.",
    hostTaken: "This domain is already registered.",
    challenge: "Challenge token",
    challengeUrl: "Challenge URL",
    domainStatus: {
        verified: "Verified",
        pending: "Pending verification",
    },
    verify: "Check the DNS proof",
    verifyTitle: "Mark this domain as verified?",
    verifyDescription:
        "To prove that this organization controls the domain, publish the DNS TXT record below, then check it. WorkAdventure accepts the domain only once the record is found.",
    verified: "Domain verified.",
    removeTitle: "Remove this domain?",
    removeDescription: "WorkAdventure will refuse logins redirected to this domain.",
    removed: "Domain removed.",
    verifyNoProof:
        "The TXT record {record} was not found or does not contain the challenge token. DNS changes can take some time to propagate.",
    verifyDnsError: "The DNS lookup of {record} failed. Try again later.",
    recordName: "TXT record name",
    recordValue: "TXT record value",
};
