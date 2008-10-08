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
 *  @namespace Holds Bouncer methods
**/
var Bouncer = (function() {

  var Matchers,
      AttributeOperators,
      Pseudos,
      Combinators,
      Cache = { };
  
  function True() { return true }
  
  Matchers = {
    // Patterns imported from Prototype JavaScript Framework.
    patterns: {
      id:           /^#([\w\-\*]+)(?:\b|$)/,
      tagName:      /^\s*(\*|[\w\-]+)(?:\b|$)?/,
      className:    /^\.([\w\-\*]+)(?:\b|$)/,
      pseudo:       /^:(\w[\w-]*)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/,
      attrPresence: /^\[((?:[\w]+:)?[\w]+)\]/,
      attr: /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/
    },

    // Generators take the result of a successful pattern match 
    // and return an element matcher.
    generators: {
      id: function(match) {
        var id = match[1];
        return function(e) {
          return e.id === id;
        };
      },
      tagName: function(match) {
        var tagName = match[1];
        if (tagName === "*") return True;
        tagName = tagName.toUpperCase();
        return function(e) {
          return e.tagName.toUpperCase() === tagName;
        };
      },
      className: function(match) {
        var pattern = new RegExp("(?:^|\\s)" + match[1] + "(?:\\s|$)");
        return function(e) {
          return pattern.test(e.className);
        };
      },
      pseudo: function(match) {
        var pseudo = match[1];
        if (!(pseudo in Pseudos)) {
          throw "Unsupported pseudo selector: " + pseudo;
        } else {
          pseudo = Pseudos[pseudo];
          // check identity with unique `True` reference to ensure
          // `hasArgument` is not coming from outside (e.g. Function.prototype),
          // and we're really dealing with a result from `pseudoWithArgument`.
          if (pseudo.hasArgument === True) {
            // give the argument to the generator
            return pseudo.generator(match[2]);
          }
          return pseudo;
        }
      },
      // FIXME: All attribute stuff will obviously not work with IE.
      attrPresence: function(match) {
        var name = match[1];
        return function(e) {
          return e.hasAttribute(name);
        };
      },
      attr: function(match) {
        var name     = match[1],
            operator = match[2],
            argument = match[5] || match[6];
        
        if (operator === "~=") {
          argument = " " + argument + " "; // precompute string used in operator
        }
        operator = AttributeOperators[operator];
        
        return function(e) {
          return operator(e.getAttribute(name), argument);
        };
      }
    }
  };
  
  AttributeOperators = {
    // `v` stand for value, `a` for argument
    "=":  function(v, a) { return v === a; },
    "!=": function(v, a) { return v !== a; },
    "^=": function(v, a) { return v.indexOf(a) == 0; },
    "$=": function(v, a) { throw "operator $= not implemented yet"; },
    "*=": function(v, a) { return v.indexOf(a) >= 0; },
    "~=": function(v, a) { return (" " + v + " ").indexOf(a) >= 0; }
  };
  
  Combinators = {
    patterns: {
      child:      /^\s*>\s*/,   // A > B
      descendant: /^\s+/,       // A B
      adjacent:   /^\s*\+\s*/,  // A + B
      later:      /^\s*~\s*/    // A ~ B
    },
    
    generators: {
      child: function(matcher) {
        return function(e) {
          return (e = e.parentNode).nodeType === 1 && matcher(e) && e;
        };
      },
      descendant: function(matcher) {
        return function(e) {
          while ((e = e.parentNode).nodeType === 1) {
            if (matcher(e)) return e;
          }
          return false;
        };
      },
      adjacent: function(matcher) {
        return function(e) {
          while ((e = e.previousSibling)) {
            if (e.nodeType === 1) return matcher(e) && e;
          }
          return false;
        };
      },
      later: function(matcher) {
        return function(e) {
          while ((e = e.previousSibling)) {
            if (e.nodeType === 1 && matcher(e)) return e;
          }
          return false;
        };
      }
    }
  };

  Pseudos = {
    // Read: “ "not" is a pseudo whose argument is an expression ”
    "not": pseudoWithArgument(function(expression) {
      var matcher = assembleMatcher(expression);
      return function(e) {
        return !matcher(e);
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
    }
  };

  function assembleMatcher(expression) {
    var matcher, match;
    
    while (expression) {
      if (!(advance(Combinators, function(g) { return g(matcher) }) ||
            advance(Matchers, function(g, m) { return combine(g(m), matcher) }))) {
        throw "Unkown or invalid CSS expression: " + expression;
      }
    }
    
    return matcher || True;
    
    function advance(domain, callback) {
      var patterns = domain.patterns;
      for (var name in patterns) {
        if ((match = expression.match(patterns[name]))) {
          expression = expression.replace(match[0], "");
          matcher = callback(domain.generators[name], match);
          return true;
        }
      }
    }
  }

  function combine(a, b) {
    if (!b)         return a;
    if (a === True) return b;
    return function(element) {
      var result = a(element);
      return result && b(result === true ? element : result);
    };
  }
  
  function pseudoWithArgument(generator) {
    return {
      hasArgument: True,
      generator:   generator
    };
  }

  return {
    /**
     *  @param   {Element} element     An element which is in DOM
     *  @param   {String}  expression  A stripped valid CSS expression
     *  @example
     *    Bouncer.match(document.body, 'body');
    **/
    match: function(element, expression) {
      if (!(expression in Cache)) {
        Cache[expression] = assembleMatcher(expression);
      }
      return Cache[expression](element);
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
    }
  };
})();