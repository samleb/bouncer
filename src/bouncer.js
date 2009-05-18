/**
 *  Bouncer v0.1a
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
 * Bouncer implements fast Selector without using "eval".
 * Specification : http://www.w3.org/TR/css3-selectors/
 * Patterns are imported matcherFrom Prototype Javascript Framework.
 * Credits to Diego Perrini for original idea and comprehensive help.
 *  
 *  
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
      if (!(name in PSEUDOS)) {
        throw "Unsupported pseudo : " + name;
      }
      return PSEUDOS[name](argument);
    }
  };
  
  var COMBINATORS = {
    ">": { dir: "parentNode" },
    " ": { dir: "parentNode", follow: true },
    "+": { dir: "previousSibling" },
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
      switch(operator) {
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
  
  function registerPseudo(name, matcher) {
    PSEUDOS[name] = K(matcher);
  }
  
  function registerPseudoWithArgument(name, matcherReturning) {
    PSEUDOS[name] = matcherReturning;
  }
  
  function createMatcher(expression) {
    var group = CSSTokenizer.tokenize(expression);
    for (var i = 0, tokens; tokens = group[i]; i++) {
      group[i] = matcherFromTokens(tokens);
    }
    return matcherFromGroupMatchers(group);
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
    var matcher, combinator
    for (var i = 0, token; token = tokens[i++];) {
      if (token.symbol in COMBINATORS) {
        matcher = addCombinator(matcher, token.symbol);
      } else {
        matcher = addMatcher(matcher, matcherFromToken(token));
      }
    }
    return matcher || K(true);
  }
  
  function addCombinator(matcher, symbol) {
    var combinator = COMBINATORS[symbol];
    return function(e) {
      while (e = e[combinator.dir]) {
        if (e.nodeType === 1) {
          if (matcher(e)) return e;
          if (!combinator.follow) break;
        }
      }
    };
  }
  
  function addMatcher(higher, lower) {
    if (!higher) return lower;
    return function(e) {
      var context = lower(e);
      return context && higher(context === true ? e : context);
    };
  }
  
  function matcherFromToken(token) {
    return SELECTORS[token.symbol].apply(null, token.captures);
  }
  
  return {
    match: match,
    registerPseudo: registerPseudo,
    registerPseudoWithArgument: registerPseudoWithArgument
  };
})();