/**
 *  Bouncer v0.1.0
 *  Copyright (c) 2008 Samuel Lebeau, Xilinus
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
**/

/**
 *  Bouncer create matchers against CSS expressions, which are `element → boolean`
 *  functions. Used in the context of event delegation, it will help determining quickly 
 *  whether or not an element is concerned by a given rule and keep your party
 *  smooth.
 *  
 *  Bouncer matchers work bottom-up, which means the rule `.product a.delete`
 *  will yield a function that starts by testing if its argument is an anchor 
 *  with the `delete` class and then tries to find an ancestor with the `product` class.
 *  
 *  Assembling matchers function takes some time, so you might want to cache and 
 *  reuse them instead of calling `match`, or `createMatcher` several times with the same
 *  expression.
 *  
 *  Cache feature is not excluded in the future.
 *  Fixing DOM implementation related bugs is excluded as Bouncer will delegate
 *  this responsability to adapters for external frameworks or libraries.
**/
var Bouncer = (function() {
  
  function K(x) {
    return function() {
      return x;
    };
  }
  
  var SELECTORS = {
    "*": function(tagName) {
      if (tagName === "*") return K(true);
      tagName = tagName.toUpperCase();
      return function(e) {
        return e.tagName === tagName;
      };
    },
    "#": function(id) {
      return function(e) {
        return e.id === id;
      };
    },
    ".": function(className) {
      var pattern = new RegExp("(^|\\s)" + className + "(\\s|$)");
      return function(e) {
        return pattern.test(e.className);
      };
    },
    "[": function(name, operator, argument) {
      if (!operator) {
        return function(e) {
          return e.hasAttribute(name);
        };
      }
      switch(operator) {
        case "~=": argument = " " + argument + " ";   break;
        case "|=": argument = argument.toLowerCase(); break;
      }
      return attributeMatcher(name, operator[0], argument);
    },
    ":": function(name, argument) {
      if (!(name in PSEUDOS)) throw {
        name: "BouncerError",
        message: "Unsupported pseudo: \"" + name + "\""
      };
      return PSEUDOS[name](argument);
    }
  };
  
  var COMBINATORS = {
    ">": { dir: "parentNode"                    },
    " ": { dir: "parentNode",      follow: true },
    "+": { dir: "previousSibling"               },
    "~": { dir: "previousSibling", follow: true }
  };
  
  var PSEUDOS = {
    "not": function(expression) {
      var matcher = createMatcher(expression);
      return function(e) {
        return !matcher(e);
      };
    },
    "first-child": K(function(e) {
      while (e = e.previousSibling) if (e.nodeType === 1) return false;
      return true;
    }),
    "last-child": K(function(e) {
      while (e = e.nextSibling) if (e.nodeType === 1) return false;
      return true;
    }),
    "empty": K(function(e) {
      return !e.firstChild;
    }),
    "enabled": K(function(e) {
      return !e.disabled && e.type !== "hidden";
    }),
    "disabled": K(function(e) {
      return e.disabled;
    }),
    "checked": K(function(e) {
      return e.checked;
    })
  };
  
  function attributeMatcher(name, operator, arg) {
    return function(e) {
      if (!e.hasAttribute(name)) return false;
      var v = e.getAttribute(name);
      switch (operator) {
        case "=": return v === arg;
        case "^": return v.indexOf(arg) === 0;
        case "*": return v.indexOf(arg) !== -1;
        case "~": return (" " + v + " ").indexOf(arg) !== -1;
        case "|": return (v = v.toLowerCase()) === arg || v.indexOf(arg + "-") === 0;
        case "$": return v.length - arg.length >= 0 && v.lastIndexOf(arg) === v.length - arg.length;
      }
    };
  }
  
  function match(element, expression) {
    return createMatcher(expression)(element);
  }
  
  function createMatcher(expression) {
    var group = Bouncer.Tokenizer.tokenize(expression);
    for (var i = 0, tokens; tokens = group[i]; i++) {
      group[i] = matcherFromTokens(tokens);
    }
    return matcherFromGroupMatchers(group);
  }
  
  function registerPseudo(name, matcher) {
    PSEUDOS[name] = K(matcher);
  }
  
  function registerPseudoWithArgument(name, matcherReturning) {
    PSEUDOS[name] = matcherReturning;
  }
  
  function matcherFromGroupMatchers(matchers) {
    if (!matchers.length) return matchers[0];
    return function(e) {
      for (var i = 0, matcher; matcher = matchers[i++];) {
        if (matcher(e)) return true;
      }
      return false;
    };
  }
  
  function matcherFromTokens(tokens) { // ["a", ">", "b", "+", "c"]
    var matcher;
    for (var i = 0, token; token = tokens[i++];) {
      if (token.symbol in COMBINATORS) {
        matcher = addCombinator(matcher, COMBINATORS[token.symbol]);
      } else {
        matcher = addMatcher(matcher, matcherFromToken(token));
      }
    }
    return matcher;
  }
  
  function addCombinator(matcher, combinator) {
    var direction = combinator.dir, follow = combinator.follow;
    return function(e) {
      while (e = e[direction]) {
        if (e.nodeType === 1) {
          if (matcher(e)) return e;
          if (!follow) break;
        }
      }
    };
  }
  
  function addMatcher(higher, deeper) {
    if (!higher) return deeper;
    return function(e) {
      var context = deeper(e);
      return context && higher(context === true ? e : context);
    };
  }
  
  function matcherFromToken(token) {
    return SELECTORS[token.symbol].apply(null, token.captures);
  }
  
  return {
    createMatcher:              createMatcher,
    match:                      match,
    registerPseudo:             registerPseudo,
    registerPseudoWithArgument: registerPseudoWithArgument
  };
})();

Bouncer.Tokenizer = (function() {
  // Patterns borrowed from Prototype Javascript Framework.
  var COMA        = /^\s*,\s*/,
      COMBINATORS = /^\s*([\s\>\~\+])\s*/,
      TAG_NAMES   = /^(\*|[\w\-]+)/;
  
  var ATOMS = {
    "#": /^#([\w\-\*]+)(?:\b|$)/,
    ".": /^\.([\w\-\*]+)(?:\b|$)/,
    "[": /^\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]=|=)\s*(?:(['"])([^\3]*?)\3|([^'"][^\]]*?)))?\]/,
    ":": /^:(\w[\w-]*)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/
  };
  
  var expr, match, tokens;

  function advance(pattern) {
    if ((match = expr.match(pattern))) {
      expr = expr.slice(match[0].length);
    }
    return match;
  }

  function found(symbol) {
    tokens.push({ 
      symbol:   symbol,
      string:   match.shift(),
      captures: match
    });
  }
  
  function handleAttributeQuotes() {
    // if quotes are present, value is in match[4].
    if (match[3]) match[5] = match[4];
    match.splice(3, 2); // -> [string, name, operator, value]
  }

  function tokenize(expression) {
    var chr, group = [[]];
    expr = expression, tokens = group[0];
    while (expr) {
      if (tokens.length) {
        if (advance(COMA)) group.push(tokens = []);
        if (advance(COMBINATORS)) found(match.pop());
      }
      if ((chr = expr[0]) in ATOMS && advance(ATOMS[chr])) {
        if (chr === "[") handleAttributeQuotes();
        found(chr);
      }
      else if (advance(TAG_NAMES)) found("*");
      else throw {
        name: "BouncerTokenizerError",
        message: "Error while parsing: \"" + expression + "\""
      };
    }
    return group;
  }

  return {
    tokenize:  tokenize
  };
})();
