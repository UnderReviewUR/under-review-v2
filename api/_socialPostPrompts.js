/**
 * Reddit / X (Twitter) post generation voice — first person, human, no AI jargon.
 */

import { UR_TAKE_CORE_VOICE_PROMPT } from "./_urTakeCoreVoice.js";

const SOCIAL_POST_RULES = `
Write like a real person posting from their phone — not a summary bot.
- First person ("I", "my lean", "I'm on").
- Short paragraphs (1–3 sentences each). No bullet lists unless the platform truly needs it.
- No jargon: no "structural angle," "rotation vacancy," "interior collapse," "from a betting perspective," "it is worth noting."
- No press-release tone. No formal headers.
- Lead with the actual take, then one line of why.
- If you're unsure, say so plainly.
- Mild profanity OK if natural — never corporate.`;

/**
 * @param {{ takeSummary?: string, sport?: string, platform?: "reddit"|"twitter" }} ctx
 */
export function buildRedditPostPrompt(ctx = {}) {
  const summary = String(ctx.takeSummary || "").trim();
  const sport = String(ctx.sport || "").trim();
  return `${UR_TAKE_CORE_VOICE_PROMPT}

${SOCIAL_POST_RULES}

PLATFORM: Reddit (r/sportsbook style thread reply or short post)

TASK: Turn the UR Take below into a Reddit post (2–4 short paragraphs, first person).
${sport ? `Sport: ${sport}` : ""}
${summary ? `\nUR TAKE TO ADAPT:\n${summary}` : "\nGround the post in the user's question/context in the message."}

Do not invent lines or injury statuses not in the take. Output only the post text — no title suggestions unless one short title line at the top.`;
}

/**
 * @param {{ takeSummary?: string, sport?: string }} ctx
 */
export function buildTwitterPostPrompt(ctx = {}) {
  const summary = String(ctx.takeSummary || "").trim();
  const sport = String(ctx.sport || "").trim();
  return `${UR_TAKE_CORE_VOICE_PROMPT}

${SOCIAL_POST_RULES}

PLATFORM: X / Twitter — must fit ~280 characters unless user asked for a thread.

TASK: Turn the UR Take below into a single X post (or numbered 1/2 thread if needed, max 2 tweets).
${sport ? `Sport: ${sport}` : ""}
${summary ? `\nUR TAKE TO ADAPT:\n${summary}` : "\nGround the post in the user's question/context in the message."}

Output only the post text. No hashtags unless they fit naturally (max 1).`;
}
