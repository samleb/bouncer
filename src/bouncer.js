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
 * Patterns are imported from Prototype Javascript Framework.
 * Credits to Diego Perrini for original idea and comprehensive help.
**/
var Bouncer = (function() {

  var Selectors,
      AttributeOperators,
      Pseudos,
      Combinators,
      Cache = { };

  function assembleSelector(expression) {
    var selector;

    function scan(selectorsType, callback) {
      var match;
      for (var i = 0, l = selectorsType.length; i < l; i += 2) {
        if ((match = expression.match(selectorsType[i]))) {
          expression = expression.slice(match[0].length);
          selector = callback(selectorsType[i + 1], selector, match);
          return true;
        }
      }
    }

    while (expression) {
      if (selector) {
        scan(Combinators, returnCombinator);
      }
      if (!scan(Selectors, returnSelector)) {
        throw "Unkown expression: " + expression;
      }
    }

    return selector || TRUE;
  }

  function returnCombinator(generator, selector) {
    return generator(selector);
  }

  function returnSelector(generator, selector, match) {
    var expression = match[0],
        part = (Cache[expression] = Cache[expression] || generator(match));
    if (!selector) return part;
    if (part === TRUE) return selector;
    return function(e) {
      var result = part(e);
      return result && selector(result === true ? e : result);
    };
  }

  function pseudoWithArgument(generator) {
    return {
      hasArgument: TRUE,
      generator:   generator
    };
  }

  function TRUE() { return true }

  Selectors = [
    // ID selectors, e.g. "#container"
    /^#([\w\-\*]+)(?:\b|$)/,
    function(m) {
      var id = m[1];
      return function(e) {
        return e.id === id;
      };
    },
    // Tag name selectors, e.g. "html"
    /^\s*(\*|[\w\-]+)(?:\b|$)?/,
    function(m) {
      var tagName = m[1];
      if (tagName === "*") return TRUE;
      tagName = tagName.toUpperCase();
      return function(e) {
        return e.tagName.toUpperCase() === tagName;
      };
    },
    // Class selectors, e.g. ".article"
    /^\.([\w\-\*]+)(?:\b|$)/,
    function(m) {
      var pattern = new RegExp("(?:^|\\s)" + m[1] + "(?:\\s|$)");
      return function(e) {
        return pattern.test(e.className);
      };
    },
    // Attributes presence selectors, e.g. "[href]"
    // FIXME: All attribute stuff will obviously not work with IE.
    /^\[((?:[\w]+:)?[\w]+)\]/,
    function(m) {
      var name = m[1];
      return function(e) {
        return e.hasAttribute(name);
      };
    },
    // Attributes selectors, e.g. "[href='#']"
    /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*(?:(['"])([^\3]*?)\3|([^'"][^\]]*?)))?\]/,
    function(m) {
      var name     = m[1],
          operator = m[2],
          arg      = m[4] || m[5];
      // precompute string used in operator
      if (operator === "~=") {
        arg = " " + arg + " ";
      } else if (operator === "|=") {
        arg = "-" + arg + "-";
      }
      operator = AttributeOperators[operator];
      return function(e) {
        return e.hasAttribute(name) && operator(e.getAttribute(name), arg);
      };
    },
    // Pseudo selectors, e.g. ":first-child", ":not(a)"
    /^:(\w[\w-]*)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/,
    function(m) {
      var pseudo = m[1];
      if (!(pseudo in Pseudos)) {
        throw "Unsupported pseudo selector: " + pseudo;
      } else {
        pseudo = Pseudos[pseudo];
        // check identity with unique `TRUE` reference to ensure
        // `hasArgument` is not coming from outside (e.g. Function.prototype),
        // and we're really dealing with a result from `pseudoWithArgument`.
        if (pseudo.hasArgument === TRUE) {
          // give the argument to the generator
          return pseudo.generator(m[2]);
        }
        return pseudo;
      }
    }
  ];

  AttributeOperators = {
    // `v` stands for value, `a` for argument
    "=":  function(v, a) { return v === a },
    "^=": function(v, a) { return v.indexOf(a) === 0 },
    "*=": function(v, a) { return v.indexOf(a) !== -1 },
    "~=": function(v, a) { return (" " + v + " ").indexOf(a) !== -1 },
    "|=": function(v, a) { return ("-" + v + "-").indexOf(a) !== -1 },
    "$=": function(v, a) {
      var i = v.length - a.length;
      return i >= 0 && v.lastIndexOf(a) === i;
    }
  };

  Combinators = [
    // Child combinator, e.g. "A > B"
    /^\s*>\s*/,
    function(matcher) {
      return function(e) {
        return (e = e.parentNode).nodeType === 1 && matcher(e) && e;
      };
    },
    // Adjacent sibling combinator, e.g. "A + B"
    /^\s*\+\s*/,
    function(matcher) {
      return function(e) {
        while ((e = e.previousSibling)) {
          if (e.nodeType === 1) return matcher(e) && e;
        }
        return false;
      };
    },
    // General sibling combinator, e.g. "A ~ B"
    /^\s*~\s*/,
    function(matcher) {
      return function(e) {
        while ((e = e.previousSibling)) {
          if (e.nodeType === 1 && matcher(e)) return e;
        }
        return false;
      };
    },
    // Descendant combinator, e.g. "A B"
    /^\s+/,
    function(matcher) {
      return function(e) {
        while ((e = e.parentNode).nodeType === 1) {
          if (matcher(e)) return e;
        }
        return false;
      };
    }
  ];

  Pseudos = {
    // Read: “ "not" is a pseudo whose argument is an expression ”
    "not": pseudoWithArgument(function(expression) {
      var selector = assembleSelector(expression);
      return function(e) {
        return !selector(e);
      };
    }),
    "first-child": function(e) {
      while ((e = e.previousSibling)) {
        if (e.nodeType === 1) return false;
      }
      return true;
    },
    "last-child": function(e) {
      while ((e = e.nextSibling)) {
        if (e.nodeType === 1) return false;
      }
      return true;
    },
    "empty": function(e) {
      return !e.firstChild;
    },
    "enabled": function(e) {
      return !e.disabled && e.type !== "hidden";
    },
    "disabled": function(e) {
      return "disabled" in e && e.disabled;
    },
    "checked": function(e) {
      return "checked" in e && e.checked;
    }
  };

  return {
    /** Matches an element against a CSS expression. */
    match: function(element, expression) {
      if (!(expression in Cache)) {
        Cache[expression] = assembleSelector(expression);
      }
      return Cache[expression](element);
    },

    /**
     *  @param   {String}   name    The name of the pseudo-selector
     *  @param   {Function} matcher The matcher
     *  @returns {void}
     *  @example
     *    Bouncer.registerPseudo("checked", function(element) {
     *      return element.checked;
     *    });
     *    Bouncer.match(document.forms.new_post.draft, ":checked");
    **/
    registerPseudo: function(name, matcher) {
      Pseudos[name] = matcher;
    },

    /**
     *  @param   {String}   name      The name of the pseudo-selector
     *  @param   {Function} generator The generator that should return a matcher
     *  @returns {void}
     *  @example
     *    Bouncer.registerPseudoWithArgument("contains", function(text) {
     *      return function(element) {
     *        return element.innerText.indexOf(text) >= 0;
     *      }
     *    });
     *    Bouncer.match(document.getElementById("article"), ":contains('these words')");
    **/
    registerPseudoWithArgument: function(name, generator) {
      Pseudos[name] = pseudoWithArgument(generator);
    }
  };
})();