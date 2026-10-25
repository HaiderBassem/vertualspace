// End-to-end test: two players, each in a page of "WorkAdventure" (https://wa.test) embedding Jitsi the way
// play/src/front/WebRtc/CoWebsite/JitsiCoWebsite.ts does, with tokens signed the way the back signs them. Passes when both
// join and both send and receive audio and video through the video bridge. See ../README.md ("Testing").
import { chromium } from "playwright-core";
import { SignJWT } from "jose";
const domain = process.env.JITSI_DOMAIN, secret = new TextEncoder().encode(process.env.JWT_SECRET), room = "wa" + Math.random().toString(36).slice(2, 8);
const tok = (n, moderator) => new SignJWT({ context: { user: { id: n, name: n, moderator }, features: { livestreaming: moderator, recording: moderator } }, sub: domain, room, moderator }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuer("workadventure").setAudience("jitsi").setExpirationTime("1d").sign(secret);
const browser = await chromium.launch({ args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
const HTML = `<!doctype html><meta charset=utf-8><body style="margin:0"><div id=j style="width:800px;height:500px"></div>`;
const embed = async (name, moderator) => {
    const ctx = await browser.newContext(); await ctx.grantPermissions(["camera", "microphone"], { origin: `https://${domain}` });
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.__pcs = []; const O = window.RTCPeerConnection; window.RTCPeerConnection = function (...a) { const pc = new O(...a); window.__pcs.push(pc); return pc; }; window.RTCPeerConnection.prototype = O.prototype; });
    await page.route("https://wa.test/**", (r) => r.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto("https://wa.test/");
    await page.addScriptTag({ url: `https://${domain}/external_api.js` });
    const jwt = await tok(name, moderator);
    await page.evaluate(({ domain, room, jwt, name }) => new Promise((resolve, reject) => {
        const api = new window.JitsiMeetExternalAPI(domain, { roomName: room, jwt, parentNode: document.getElementById("j"), width: 800, height: 500, userInfo: { displayName: name },
            configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false, prejoinPageEnabled: false }, interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false } });
        window.__api = api; api.addListener("videoConferenceJoined", () => resolve(true)); setTimeout(() => reject(new Error("never joined")), 60000);
    }), { domain, room, jwt, name });
    console.log(`${name} joined through the embedded API`);
    return page;
};
const frameOf = (page) => page.frames().find((f) => f.url().startsWith(`https://${domain}/`));
const measure = (frame) => frame.evaluate(async () => { const out = { audio: 0, video: 0, sent: 0, paths: [], tracks: 0 }; try { out.tracks = (window.APP.store.getState()["features/base/tracks"] || []).filter((t) => t.local).length; } catch {} for (const pc of window.__pcs ?? []) { const st = await pc.getStats(); for (const r of st.values()) { if (r.type === "inbound-rtp") out[r.kind] += r.bytesReceived ?? 0; if (r.type === "outbound-rtp") out.sent += r.bytesSent ?? 0; if (r.type === "candidate-pair" && r.nominated && r.state === "succeeded") { const l = st.get(r.localCandidateId), m = st.get(r.remoteCandidateId); out.paths.push(`${l?.candidateType}/${l?.protocol}->${m?.candidateType}/${m?.protocol}`); } } } return out; });
const a = await embed("alice", true), b = await embed("bob", false);
let ok = true;
for (const [n, p] of [["alice", a], ["bob", b]]) {
    let s; for (let i = 0; i < 24; i++) { s = await measure(frameOf(p)); if (s.audio > 0 && s.video > 0) break; await new Promise((r) => setTimeout(r, 2500)); }
    console.log(`${n}: local tracks ${s.tracks}, sent ${s.sent} bytes, received audio ${s.audio} + video ${s.video} bytes via ${s.paths.join(" ")}`);
    if (!(s.audio > 0 && s.video > 0)) ok = false;
}
await browser.close(); console.log(ok ? "EMBED E2E OK" : "EMBED E2E FAILED"); process.exit(ok ? 0 : 1);
