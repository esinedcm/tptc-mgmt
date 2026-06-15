const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../public/release-notes.json');

try {
  // Get the last 30 commits
  const log = execSync('git log -30 --pretty=format:"%h|%aI|%s"').toString();
  
  const allCommits = log.split('\n').map(line => {
    const [hash, date, ...messageParts] = line.split('|');
    return { hash, date, message: messageParts.join('|').trim() };
  });

  // Filter for release notes (e.g., feat:, fix:, Feature:, Fix:, Update:)
  // Exclude technical noise
  const validPrefixes = ['feat:', 'fix:', 'feature:', 'update:', 'release:'];
  
  const releaseNotes = allCommits.filter(commit => {
    const lowerMsg = commit.message.toLowerCase();
    return validPrefixes.some(prefix => lowerMsg.startsWith(prefix));
  }).map(commit => {
    // Clean up the prefix for the UI
    let cleanMessage = commit.message;
    const prefixMatch = cleanMessage.match(/^(feat|fix|feature|update|release):\s*/i);
    let type = 'Update';
    
    if (prefixMatch) {
      cleanMessage = cleanMessage.substring(prefixMatch[0].length);
      const matchedPrefix = prefixMatch[1].toLowerCase();
      if (matchedPrefix === 'feat' || matchedPrefix === 'feature') type = 'New Feature';
      else if (matchedPrefix === 'fix') type = 'Bug Fix';
      else if (matchedPrefix === 'release') type = 'Release';
    }

    // Capitalize first letter
    cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);

    return {
      hash: commit.hash,
      date: commit.date,
      type: type,
      message: cleanMessage
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(releaseNotes, null, 2));
  console.log(`Generated release notes for ${releaseNotes.length} commits.`);
} catch (e) {
  console.log("Could not generate release notes from git. Creating empty fallback.");
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify([], null, 2));
}
