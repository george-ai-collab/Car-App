// Real online test: two people on two "phones" using the live backend.
// Run by GitHub on every PR (see .github/workflows/build-apk.yml):
//   npm run build && npx vite preview --port 4173 &  node e2e/online.mjs http://localhost:4173
// It makes two throwaway accounts, checks they can see and react to each other,
// then deletes both accounts again.
import { chromium, devices } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const url = process.argv[2] || "http://localhost:4173";
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const photo = new URL("./test-photo.jpg", import.meta.url).pathname;
mkdirSync("e2e-shots", { recursive: true });

const browser = await chromium.launch();
const results = [];
let failed = 0;
const errors = [];

async function phone(name) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  return page;
}
const btn = (page, name) => page.getByRole("button", { name, exact: true });
async function step(label, page, fn) {
  try { await fn(); results.push(`✅ ${label}`); console.log("ok   ", label); }
  catch (e) {
    failed++; results.push(`❌ ${label} — ${e.message.split("\n")[0]}`); console.log("FAIL ", label, "-", e.message.split("\n")[0]);
    await page?.screenshot({ path: `e2e-shots/${label.replace(/\W+/g, "_")}.png` }).catch(() => {});
  }
}

async function signUp(page, name, handle, welcome) {
  await page.getByTestId("mode-create").click();
  await page.getByPlaceholder("e.g. George Q").fill(name);
  await page.getByPlaceholder("e.g. george_q").fill(handle);
  await page.getByText("Available").waitFor();
  await page.getByTestId("email").fill(`carfooly.e2e.${handle}@mailinator.com`);
  await page.getByTestId("password").fill(`Test-${run}-pass`);
  await page.getByTestId("submit-create").click();
  await Promise.race([
    page.getByTestId("auth-error").waitFor().then(async () => { throw new Error(await page.getByTestId("auth-error").innerText()); }),
    page.getByTestId("welcome").waitFor(),
  ]);
  // New-account setup: A fills it in (bio + Club), B skips through.
  if (welcome) {
    await page.getByPlaceholder("Your cars, your scene, your plans").fill(welcome.bio);
    await page.getByTestId("welcome-next").click();
    await page.getByTestId(`type-${welcome.type}`).click();
    await page.getByTestId("welcome-next").click();
  } else {
    await page.getByTestId("welcome-skip").click(); await page.getByTestId("welcome-skip").click();
  }
  await page.getByTestId("welcome-done").click();
  try { await page.getByTestId("tour").waitFor({ timeout: 3000 }); await btn(page, "Skip").click(); } catch { /* no tour */ }
}
async function deleteAccount(page) {
  await page.locator("[data-tab=profile]").click();
  await page.locator("button[aria-label=Settings]").click();
  await page.getByText("Delete account").click();
  await btn(page, "Delete everything").click();
  await page.getByTestId("mode-create").waitFor();
}

const a = `e2ea_${run}`.slice(0, 24), b = `e2eb_${run}`.slice(0, 24);
const caption = `Online test ${run}`;
const A = await phone("A");
const B = await phone("B");

await step("A: create an account with email + password, then the welcome steps", A, () => signUp(A, "Test Driver A", a, { bio: `Bio ${run}`, type: "club" }));
await step("A: post a photo (uploads to photo storage)", A, async () => {
  await A.locator("[data-tab=add]").click();
  await A.getByTestId("add-post").click();
  await A.getByTestId("compose-pick").waitFor();
  await A.getByTestId("pick-gallery").setInputFiles(photo);
  await A.getByTestId("compose-edit").waitFor();
  await btn(A, "Next").click();
  await A.getByTestId("compose-details").waitFor();
  await A.locator("[data-testid=compose-details] textarea").first().fill(caption);
  await btn(A, "Share").click();
  await A.locator("[data-tab=feed]").waitFor();
  await A.waitForTimeout(6000); // let the upload + save finish
});
await step("B: create a second account (handle check sees A's handle as taken)", B, async () => {
  await B.getByTestId("mode-create").click();
  await B.getByPlaceholder("e.g. george_q").fill(a);
  await B.getByText("Taken. Try another.").waitFor();
  await signUp(B, "Test Driver B", b);
});
await step("B: sees A's post, with the photo coming from online storage", B, async () => {
  const slide = B.locator("[data-testid=feed-slide]", { hasText: caption });
  await slide.waitFor();
  const srcs = await slide.locator("img").evaluateAll((imgs) => imgs.map((i) => i.src));
  if (!srcs.some((s) => s.includes("supabase.co/storage"))) throw new Error("photo not from storage: " + srcs.join(", ").slice(0, 200));
});
await step("B: likes, comments on and follows A", B, async () => {
  const slide = B.locator("[data-testid=feed-slide]", { hasText: caption });
  await slide.getByRole("button", { name: "Like" }).click();
  await slide.getByRole("button", { name: "Follow" }).first().click();
  await slide.getByRole("button", { name: "Comments" }).click();
  await B.getByPlaceholder("Add a comment…").fill("Clean!");
  await btn(B, "Post").last().click();
  await B.waitForTimeout(4000);
});
await step("B: sees A's bio and Club label (saved online in the welcome steps)", B, async () => {
  await B.reload(); // close the comments panel (it stays open on purpose to keep drafts)
  await B.locator("[data-testid=feed-slide]", { hasText: caption }).getByRole("button", { name: `Open ${a}` }).first().click();
  await B.getByText(`Bio ${run}`).waitFor();
  await B.getByTestId("account-label").filter({ hasText: "CLUB" }).waitFor();
  await B.locator("[data-tab=feed]").click();
});
await step("A: after reopening the app, still signed in and gets all 3 notifications", A, async () => {
  await A.reload();
  await A.getByText("For You").waitFor();
  await A.getByRole("button", { name: "Notifications" }).click();
  await A.getByText("liked your post").waitFor();
  await A.getByText('commented: "Clean!"').waitFor();
  await A.getByText("started following you").waitFor();
  await A.screenshot({ path: "e2e-shots/inbox-A.png" });
});
await step("B: unlike quietly removes those notifications for A", B, async () => {
  await B.reload(); // reopen the app (the comments panel stays open on purpose to keep drafts)
  const slide = B.locator("[data-testid=feed-slide]", { hasText: caption });
  await slide.waitFor();
  await slide.getByRole("button", { name: "Like" }).click();
  await B.waitForTimeout(4000);
  await A.reload();
  await A.getByText("For You").waitFor();
  await A.getByRole("button", { name: "Notifications" }).click();
  await A.getByText('commented: "Clean!"').waitFor();
  // The app first shows the copy saved on the phone, then swaps in fresh data.
  await A.getByText("liked your post").waitFor({ state: "detached", timeout: 20000 }).catch(() => { throw new Error("like notification still there"); });
});
await step("A: log out, then log back in with the handle (not the email), no tour again", A, async () => {
  await A.locator("[data-tab=profile]").click();
  await A.locator("button[aria-label=Settings]").click();
  await A.getByText("Log out", { exact: true }).first().click();
  await btn(A, "Log out").last().click();
  await A.getByTestId("mode-login").click();
  await A.getByTestId("email").fill("@" + a);
  await A.getByTestId("password").fill("wrong-password");
  await A.getByTestId("submit-login").click();
  await A.getByText("Wrong handle or password.").waitFor();
  await A.getByTestId("password").fill(`Test-${run}-pass`);
  await A.getByTestId("submit-login").click();
  await A.getByText("For You").waitFor();
  await A.waitForTimeout(1500);
  if (await A.getByTestId("tour").count()) throw new Error("tour showed again on login");
});
await step("B: delete account", B, () => deleteAccount(B));
await step("A: delete account", A, () => deleteAccount(A));
await step("A: deleted account can't log in any more", A, async () => {
  await A.getByTestId("mode-login").click();
  await A.getByTestId("email").fill(`carfooly.e2e.${a}@mailinator.com`);
  await A.getByTestId("password").fill(`Test-${run}-pass`);
  await A.getByTestId("submit-login").click();
  await A.getByText("Wrong email or password.").waitFor();
});

await browser.close();
if (errors.length) results.push(`⚠️ page errors: ${errors.slice(0, 5).join(" | ")}`);
const summary = `${failed ? "❌" : "✅"} **Online test (2 accounts, live backend): ${failed ? `${failed} failed` : "all passed"}**\n\n${results.join("\n")}`;
writeFileSync("e2e-result.md", summary + "\n");
console.log(summary);
process.exit(failed ? 1 : 0);
