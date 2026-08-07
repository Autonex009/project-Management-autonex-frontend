// Tidying names for DISPLAY only.
//
// The roster holds what people typed at onboarding: three- and four-part names
// that overflow a table cell, and some entered in caps lock ("SANDEEP KUMAR").
// Nothing here is ever written back — the stored name stays exactly as given, and
// search, sorting and every form still work on the original. Only the rendered
// label changes.
//
// Keep the full name reachable somewhere on screen (a title attribute or the row's
// hover card): a middle name is sometimes the only thing telling two colleagues
// apart, so it must not simply vanish.

/** Split on any run of whitespace, dropping empties. */
const words = (name) =>
  String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/**
 * Capitalise a single word, but only when its case carries no information.
 *
 * ALL CAPS and all-lowercase are almost always typing habits, so they get fixed.
 * Anything already mixed-case is left alone, because that is where the real
 * spellings live — McDonald, DeSouza, d'Angelo — and "fixing" those is worse than
 * doing nothing. Sub-parts after a hyphen or apostrophe are capitalised too, so
 * "smith-jones" reads "Smith-Jones".
 */
const capitalise = (word) => {
  const isAllUpper = word === word.toUpperCase();
  const isAllLower = word === word.toLowerCase();
  if (!isAllUpper && !isAllLower) return word;

  return word
    .toLowerCase()
    .replace(
      /(^|[-'’])([a-z])/g,
      (_, prefix, char) => prefix + char.toUpperCase(),
    );
};

/**
 * Fix shouted or lowercased names: "SANDEEP KUMAR" -> "Sandeep Kumar".
 * Mixed-case words are returned untouched.
 */
export const toDisplayCase = (name) => words(name).map(capitalise).join(" ");

/**
 * Drop the middle name(s): "Vishwatej Babasaheb Sarang" -> "Vishwatej Sarang".
 *
 * One- and two-word names are returned as they are. Only the first and last parts
 * survive, which is the convention people use verbally anyway.
 */
export const toShortName = (name) => {
  const parts = words(name);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

/**
 * The label to render in a list or table: middle names dropped, shouting fixed.
 *
 * Returns "" for a missing name so callers can fall back with `||`.
 */
export const formatDisplayName = (name) => toShortName(toDisplayCase(name));

/**
 * The text a name should be SEARCHED against — the stored name AND the shortened
 * label, lowercased.
 *
 * Both are needed, because neither contains the other:
 *
 *   stored "Vishwatej Babasaheb Sarang"  — typing the middle name only matches here
 *   label  "Vishwatej Sarang"            — typing what is on screen only matches here
 *
 * Filtering on the label alone loses anyone searched for by their middle name;
 * filtering on the stored name alone loses anyone searched for by the name the
 * table actually shows them. Use this anywhere a query is matched against a
 * person, and keep `formatDisplayName` for rendering.
 */
export const nameSearchText = (name) => {
  const full = String(name ?? "").trim();
  if (!full) return "";
  const short = formatDisplayName(full);
  return (short && short !== full ? `${full} ${short}` : full).toLowerCase();
};

/**
 * Initials for an avatar, from the same shortened form so the circle agrees with
 * the label beside it — "VS" for Vishwatej Sarang, not "VB".
 */
export const getNameInitials = (name, max = 2) => {
  const parts = words(toShortName(toDisplayCase(name)));
  if (parts.length === 0) return "?";
  return parts
    .slice(0, max)
    .map((part) => part[0].toUpperCase())
    .join("");
};

export default formatDisplayName;
