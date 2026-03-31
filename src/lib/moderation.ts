// Basic content moderation filter for community posts and comments.
// Checks for slurs, hate speech, explicit sexual content, and threats.

const BLOCKED_PATTERNS = [
  // Slurs and hate speech (partial list — extend as needed)
  /\bn[i1]gg[ae3]r?s?\b/i,
  /\bf[a@]gg?[o0]ts?\b/i,
  /\bk[i1]ke\b/i,
  /\bsp[i1]c[k]?s?\b/i,
  /\bch[i1]nk\b/i,
  /\bwetback\b/i,
  /\btrann[yie]\b/i,
  /\bretard(ed)?\b/i,

  // Threats of violence
  /\b(kill|murder|shoot|stab)\s+(you|him|her|them|myself)\b/i,
  /\bi'?ll\s+(kill|murder|shoot|stab)\b/i,
  /\bdeath\s+threat\b/i,

  // Explicit sexual content
  /\bd[i1]ck\s*pic\b/i,
  /\bnudes?\s+(of|from)\b/i,
  /\bsend\s+nudes\b/i,
  /\bcp\b.*\bchild\b/i,

  // Self-harm
  /\bkill\s+myself\b/i,
  /\bsuicid(e|al)\b/i,

  // Spam patterns
  /\b(buy|order|discount)\s+\w+\s+(online|now|cheap)\b/i,
  /(https?:\/\/\S+){3,}/i,
];

export function moderateContent(text: string): { allowed: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        reason: "Your post contains content that violates our community guidelines. Please revise and try again.",
      };
    }
  }
  return { allowed: true };
}
