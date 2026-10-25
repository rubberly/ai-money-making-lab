import { outreachPhrase } from './audit.js';

// Drafts only. This tool never sends email; the user copies the draft into their own mail client.
export function draftOutreach({ prospect = {}, audit = null, settings = {}, sampleLink = '' }) {
  const warnings = [];
  const name = (prospect.contactName || '').trim();
  const business = (prospect.name || 'your business').trim();
  let domain = '';
  try { domain = prospect.website ? new URL(prospect.website).hostname.replace(/^www\./, '') : ''; } catch { /* ignore */ }

  const issues = (audit?.topIssues || []).slice(0, 2).map(outreachPhrase).filter(Boolean);
  if (!audit) warnings.push('No audit yet. Run an audit first so the email can mention specific, true issues.');
  else if (!issues.length) warnings.push('The audit found no significant issues. Consider skipping this prospect; their site is already in decent shape.');

  if (!settings.senderName) warnings.push('Add your name in Settings.');
  if (!settings.postalAddress) warnings.push('Add a valid physical postal address in Settings. US CAN-SPAM requires one in commercial email.');
  if (prospect.email === undefined || !prospect.email) warnings.push('This prospect has no public email saved. Use the contact method listed on their site.');

  const trade = (prospect.trade || '').trim().toLowerCase();
  const town = (prospect.town || '').trim();
  const looking = trade ? `${trade} websites${town ? ` in ${town}` : ''}` : town ? `local business websites in ${town}` : '';
  const intro = looking
    ? `I was looking at ${looking} and came across ${domain || business}.`
    : `I came across ${domain || `${business}'s website`}.`;

  const bulletLines = issues.length
    ? `A couple of things I noticed:\n${issues.map(i => `- ${i.charAt(0).toUpperCase()}${i.slice(1)}`).join('\n')}\n\n`
    : '';
  const sample = sampleLink
    ? `I put together a quick sample of a mobile-friendly version so you can see the difference: ${sampleLink}`
    : 'I put together a quick sample of a mobile-friendly version. Happy to send it over if you would like to see it.';
  const price = prospect.priceQuoted ? ` If you like it, I can finish it and put it live for ${settings.currency || '$'}${prospect.priceQuoted}.` : '';

  const subject = `Quick idea for ${business}'s website`;
  const body = `Hi ${name || 'there'},

${intro}

${bulletLines}${sample} There's no cost or obligation to look.${price}

If it's not useful, just reply "no thanks" and I won't contact you again.

Thanks,
${settings.senderName || '[Your name]'}${settings.senderBusiness ? `\n${settings.senderBusiness}` : ''}${settings.replyEmail ? `\n${settings.replyEmail}` : ''}

--
${settings.postalAddress || '[Your physical postal address: required]'}
You're receiving this one-off email because ${business} is publicly listed${prospect.source ? ` (${prospect.source})` : ''}. Reply "unsubscribe" and I won't email you again.`;

  return { subject, body, warnings, issuesUsed: issues.length };
}
