/**
 * The body each destination receives for an event:
 *
 * - Slack: text (notification fallback) + Block Kit blocks; &, < and > escaped (no injected mention or link).
 * - Discord: one embed, no content; markdown escaped and allowed_mentions empty (nobody is pinged).
 * - Teams (Workflows): { type: "message", attachments: [Adaptive Card 1.4] }.
 * - Webhook, Zapier, n8n: Standard Webhooks JSON { type, timestamp, data } (machine-readable, not translated).
 */
import type { NotificationMessage } from "./events";

const TONE_COLORS = { info: 0x2b47c2, success: 0x067647, warning: 0xb54708, danger: 0xb42318 } as const;

function clip(value: string, max: number): string {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Slack mrkdwn: only &, < and > are control characters (https://api.slack.com/reference/surfaces/formatting). */
export function escapeSlack(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function slackMessage(message: NotificationMessage): { text: string; blocks: unknown[] } {
    const fields = message.facts.slice(0, 10).map((fact) => ({
        type: "mrkdwn",
        text: clip(`*${escapeSlack(fact.label)}*\n${escapeSlack(fact.value)}`, 2000),
    }));
    return {
        text: clip(escapeSlack(`${message.title}: ${message.text}`), 3000),
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: clip(`*${escapeSlack(message.title)}*\n${escapeSlack(message.text)}`, 3000),
                },
                ...(fields.length > 0 ? { fields } : {}),
            },
            { type: "context", elements: [{ type: "mrkdwn", text: clip(escapeSlack(message.context), 3000) }] },
        ],
    };
}

/**
 * Discord markdown: backslash-escape the formatting characters (masked links, emphasis, quotes, headings, mention
 * syntax). Discord shows the characters without the backslashes; allowed_mentions also stops any ping.
 */
export function escapeDiscord(value: string): string {
    return value.replace(/([\\*_~`|>[\]()#<])/g, "\\$1");
}

export function discordPayload(message: NotificationMessage) {
    return {
        username: "AdminSpace",
        allowed_mentions: { parse: [] as string[] },
        embeds: [
            {
                title: clip(escapeDiscord(message.title), 256),
                description: clip(escapeDiscord(message.text), 4000),
                color: TONE_COLORS[message.tone],
                timestamp: message.occurredAt,
                fields: message.facts.slice(0, 25).map((fact) => ({
                    name: clip(escapeDiscord(fact.label), 256),
                    value: clip(escapeDiscord(fact.value), 1024),
                    inline: true,
                })),
                footer: { text: clip(message.context, 2048) },
            },
        ],
    };
}

/** Adaptive Card TextBlocks render a subset of markdown: neutralize link and emphasis syntax in data. */
export function escapeCardText(value: string): string {
    return value.replace(/([\\*_~`[\]()#>])/g, "\\$1");
}

export function teamsPayload(message: NotificationMessage) {
    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                contentUrl: null,
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "TextBlock",
                            text: clip(escapeCardText(message.title), 300),
                            weight: "Bolder",
                            size: "Medium",
                            wrap: true,
                            color:
                                message.tone === "warning"
                                    ? "Warning"
                                    : message.tone === "danger"
                                      ? "Attention"
                                      : "Default",
                        },
                        { type: "TextBlock", text: clip(escapeCardText(message.text), 2000), wrap: true },
                        ...(message.facts.length > 0
                            ? [
                                  {
                                      type: "FactSet",
                                      facts: message.facts.slice(0, 10).map((fact) => ({
                                          title: clip(escapeCardText(fact.label), 100),
                                          value: clip(escapeCardText(fact.value), 500),
                                      })),
                                  },
                              ]
                            : []),
                        {
                            type: "TextBlock",
                            text: clip(escapeCardText(message.context), 300),
                            isSubtle: true,
                            size: "Small",
                            wrap: true,
                        },
                    ],
                },
            },
        ],
    };
}

/** Standard Webhooks payload: { type, timestamp, data }. */
export function webhookBody(event: { type: string; occurredAt: Date; data: Record<string, unknown> }): string {
    return JSON.stringify({ type: event.type, timestamp: event.occurredAt.toISOString(), data: event.data });
}
