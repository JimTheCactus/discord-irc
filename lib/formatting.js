import ircFormatting from 'irc-formatting';
import SimpleMarkdown from 'simple-markdown';
import colors from 'irc-colors';

function mdNodeToIRC(node) {
  let { content } = node;
  if (Array.isArray(content)) content = content.map(mdNodeToIRC).join('');
  switch (node.type) {
    case 'em':
      return colors.italic(content);
    case 'strong':
      return colors.bold(content);
    case 'u':
      return colors.underline(content);
    case 'spoiler':
      return colors.red.bgred(`||${content}||`);
    default:
      return content;
  }
}

// Add some additional rules unique to Discord.
const spoilerRule = {
  // Specify the order in which this rule is to be run
  order: SimpleMarkdown.defaultRules.em.order + 0.5,

  // First we check whether a string matches. (Looking for "||<text>||")
  match(source) {
    return /^\|\|([\s\S]+?)\|\|(?!_)/.exec(source);
  },

  // Then parse this string into a syntax node
  parse(capture, parse, state) {
    return {
      content: parse(capture[1], state)
    };
  },
};

const discordRules = { ...SimpleMarkdown.defaultRules, spoiler: spoilerRule };

// And make a static parser that we can use repeatedly.
const discordParser = SimpleMarkdown.parserFor(discordRules);

const parseDiscordMessage = function (text) {
  return discordParser(text, { inline: true });
};

export function formatFromDiscordToIRC(text) {
  const markdownAST = parseDiscordMessage(text);
  return markdownAST.map(mdNodeToIRC).join('');
}

export function formatFromIRCToDiscord(text) {
  const blocks = ircFormatting.parse(text).map(block => ({
    // Consider reverse as italic, some IRC clients use that
    ...block,
    italic: block.italic || block.reverse
  }));
  let mdText = '';

  for (let i = 0; i <= blocks.length; i += 1) {
    // Default to unstyled blocks when index out of range
    const block = blocks[i] || {};
    const prevBlock = blocks[i - 1] || {};

    // Add start markers when style turns from false to true
    if (!prevBlock.italic && block.italic) mdText += '*';
    if (!prevBlock.bold && block.bold) mdText += '**';
    if (!prevBlock.underline && block.underline) mdText += '__';

    // Add end markers when style turns from true to false
    // (and apply in reverse order to maintain nesting)
    if (prevBlock.underline && !block.underline) mdText += '__';
    if (prevBlock.bold && !block.bold) mdText += '**';
    if (prevBlock.italic && !block.italic) mdText += '*';

    mdText += block.text || '';
  }

  return mdText;
}
