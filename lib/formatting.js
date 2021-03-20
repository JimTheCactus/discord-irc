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
    case 'strikethrough':
      return `~${content}~`;
    case 'spoiler':
      return colors.red.bgred(`||${content}||`);
    case 'inlineCode':
      return colors.white.bgblack(`\`${content}\``);
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
      type: 'spoiler',
      content: parse(capture[1], state)
    };
  },
};

// Grab the rules we know what to do with out of the defaults, and add ours.
const discordRules = {
  em: SimpleMarkdown.defaultRules.em,
  strong: SimpleMarkdown.defaultRules.strong,
  u: SimpleMarkdown.defaultRules.u,
  strikethrough: SimpleMarkdown.defaultRules.del,
  escape: SimpleMarkdown.defaultRules.escape,
  newline: SimpleMarkdown.defaultRules.newline,
  paragraph: SimpleMarkdown.defaultRules.paragraph,
  inlineCode: SimpleMarkdown.defaultRules.inlineCode,
  text: SimpleMarkdown.defaultRules.text,
  spoiler: spoilerRule
};

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
