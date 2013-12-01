/**
 *  Bouncer.tokenize(expression) -> [Array...]
 *  - expression (String): Valid stripped CSS selector expression.
 *   
 *  Splits the given expression in an array whose elements represents
 *  comma-separated grouped rules as specified in the
 *  [CSS Specification](http://www.w3.org/TR/CSS2/selector.html#grouping).
 *  
 *  Each rule is in turn split into tokens which are objects with `symbol`,
 *  `lexeme`, and `captures` properties : 
 *  
 *  - `symbol`: A symbol representing the atomic selector.
 *    - `*`: tag name
 *    - `#`: id
 *    - `.`: class name
 *    - `[`: attribute
 *    - `:`: pseudo
 *    - ` `: descendant
 *    - `>`: child
 *    - `~`: later sibling
 *    - `+`: adjacent sibling
 *  
 *  - `lexeme`: The matched string.
 *  
 *  - `captures`: An array of parts depending on the selector's type.
 *  
 *  ### Examples
 *  
 *      Bouncer.tokenize("a, p");
 *      // =>
 *      [ [ { symbol: "*", lexeme: "a", captures: ["a"] } ],
 *        [ { symbol: "*", lexeme: "p", captures: ["p"] } ] ]
 *      
 *      Bouncer.tokenize("p > a");
 *      // =>
 *      [ [ { symbol: "*", lexeme: "p",   captures: ["p"] },
 *          { symbol: ">", lexeme: " > ", captures: []    },
 *          { symbol: "*", lexeme: "a",   captures: ["a"] } ] ]
 *      
 *      Bouncer.tokenize("a[href^=#]");
 *      // =>
 *      [ [ { symbol: "*", lexeme: "a", captures: ["a"] },
 *          { symbol: "[", lexeme: "[href^=#]", captures: ["href", "^=", "#"] } ] ]
 *      
 *      Bouncer.tokenize("p:not(:first-child)");
 *      // =>
 *      [ [ { symbol: "*", lexeme: "p", captures: ["p"] },
 *          { symbol: ":", lexeme: ":not(:first-child)", captures: ["not", ":first-child"] } ] ]
**/
var Tokenizer = (function() {
  // Patterns adapted from Prototype Javascript Framework.
  var COMA       = /^\s*,\s*/,
      COMBINATOR = /^\s*([\s\>\~\+])\s*/,
      TAG_NAME   = /^(\*|[\w\-]+)/;

  var ATOM = {
    "#": /^#([\w\-\*]+)(?:\b|$)/,
    ".": /^\.([\w\-\*]+)(?:\b|$)/,
    "[": /^\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]=|=)\s*(?:(['"])([^\3]*?)\3|([^'"][^\]]*?)))?\]/,
    ":": /^:(\w[\w-]*)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/
  };

  var expr, match, tokens;

  function consume(pattern) {
    if (match = expr.match(pattern)) {
      expr = expr.slice(match[0].length);
    }
    return match;
  }

  function push(symbol) {
    tokens.push({
      symbol:   symbol,
      lexeme:   match.shift(),
      captures: match
    });
  }

  function handleAttributeQuotes() {
    // if quotes are present, value is in match[4].
    if (match[3]) match[5] = match[4];
    match.splice(3, 2); // -> [lexeme, name, operator, value]
  }

  function tokenize(expression) {
    var result = [[]], chr;
    expr = expression, tokens = result[0];
    while (expr) {
      if (tokens.length) {
        if (consume(COMA)) result.push(tokens = []);
        else if (consume(COMBINATOR)) push(match[1]);
      }
      if ((chr = expr.charAt(0)) in ATOM && consume(ATOM[chr])) {
        if (chr === "[") {
          handleAttributeQuotes();
        }
        push(chr);
      }
      else if (consume(TAG_NAME)) push("*");
      else throw {
        name: "BouncerTokenizerError",
        message: "Error while parsing - expression: " + expression
      };
    }
    return result;
  }

  return {
    tokenize: tokenize
  };
})();
