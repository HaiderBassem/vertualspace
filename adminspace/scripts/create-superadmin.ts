/**
 * Creates a superadmin account from the command line (e.g. when deploying, or to regain access).
 *
 *   npm run superadmin:create -- --email admin@example.com --name "Ada Lovelace"
 *
 * The password is read from ADMIN_PASSWORD, or asked interactively (input hidden on a terminal).
 * Running it again with an existing email changes nothing.
 */
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { audit } from "../src/lib/server/audit";
import { checkPasswordPolicy, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../src/lib/server/auth/credentials";
import { closeDb } from "../src/lib/server/db/client";
import { createAccount, findAccountByEmail } from "../src/lib/server/services/accounts";

const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
    allowPositionals: false,
});

/** Asks a question; on a terminal, the typed characters are not echoed. */
function ask(question: string, hidden: boolean): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const muted = hidden && process.stdout.isTTY;
    if (muted) {
        // readline echoes through _writeToOutput: print the prompt, swallow the typed characters.
        const internal = rl as unknown as { _writeToOutput: (text: string) => void; output: NodeJS.WriteStream };
        internal._writeToOutput = (text: string) => {
            if (text.includes(question)) internal.output.write(question);
        };
    }
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            if (muted) process.stdout.write("\n");
            resolve(answer);
        });
    });
}

async function main(): Promise<number> {
    const email = values.email?.trim() ?? "";
    const name = values.name?.trim() || email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('Usage: npm run superadmin:create -- --email admin@example.com --name "Full Name"');
        return 1;
    }
    if (await findAccountByEmail(email)) {
        console.info(`An account already exists for ${email}: nothing changed.`);
        return 0;
    }

    let password = process.env.ADMIN_PASSWORD ?? "";
    if (!password) {
        password = await ask(`Password (${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters): `, true);
        const confirmation = await ask("Confirm password: ", true);
        if (password !== confirmation) {
            console.error("The passwords do not match.");
            return 1;
        }
    }
    const problem = checkPasswordPolicy(password);
    if (problem) {
        console.error(
            problem === "tooShort"
                ? `The password must have at least ${PASSWORD_MIN_LENGTH} characters.`
                : `The password must have at most ${PASSWORD_MAX_LENGTH} characters.`,
        );
        return 1;
    }

    const account = await createAccount({ email, name, password, isSuperadmin: true });
    await audit({
        action: "account.create",
        actorLabel: "cli:create-superadmin",
        targetType: "account",
        targetId: account.id,
        details: { email: account.email, superadmin: true, via: "cli" },
    });
    console.info(`Superadmin ${account.email} created.`);
    return 0;
}

const code = await main().catch((error: unknown) => {
    console.error(error);
    return 1;
});
await closeDb();
process.exit(code);
