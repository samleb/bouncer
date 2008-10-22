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
      CombinatorPattern = /^\s*([\+\s~>,])\s*/,
      PredicatesCache   = { },
      MatchersCache     = { };
  
  function TRUE() {
    return true;
  }
  
  /** Matches an element against a stripped CSS expression. */
  function match(element, expression) {
    if (!(expression in MatchersCache)) {
      MatchersCache[expression] = createMatcher(expression);
    }
    return MatchersCache[expression](element);
  }
  
  function createMatcher(expression) {
    var parts = scanExpression(expression);
    return parts.length === 1 ? parts[0] : function(e) {
      return matchRestingParts(e, parts, parts.length);
    }
  }
  
  function scanExpression(expression) {
    var match,
        parts = [ ];
    
    function scan(pattern) {
      if ((match = expression.match(pattern))) {
        expression = expression.slice(match[0].length);
      }
      return match;
    }
    
    while (expression) {
      if (parts.length && scan(CombinatorPattern)) {
        parts.push(Combinators[match[1]]);
      }
      for (var i = 0, l = Selectors.length; i < l; i++) {
        if (scan(Selectors[i].pattern)) {
          parts.push(Selectors[i].getPredicate(match));
          break;
        }
      }
      if (!match) {
        throw "Unkown expression: " + expression;
      }
    }
    
    return parts;
  }
  
  // div span.author > a, a:target
  // (',' ('>' (' ', 'div', 'span.author') 'a') 'a:target')
  
  function createSelector(pattern, generator) {
    return {
      pattern:      pattern,
      getPredicate: function(match) {
        if (match[0] in PredicatesCache) return PredicatesCache[match[0]];
        return PredicatesCache[match.shift()] = generator.apply(null, match);
      }
    };
  }
  
  function createCombinator(direction, follow) {
    return function(e, parts, index) {
      while ((e = e[direction])) {
        if (e.nodeType === 1) {
          if (matchRestingParts(e, parts, index)) return true;
          if (!follow) break;
        }
      }
      return false;
    };
  }
  
  function createPseudoWithArgument(generator) {
    return {
      hasArgument:  TRUE,
      getPredicate: generator
    };
  }
  
  function matchRestingParts(e, parts, index) {
    var part;
    while ((part = parts[--index])) {
      if (part.length === 3) {
        return part(e, parts, index);
      }
      if (!part(e)) return false;
    }
    return true;
  }
  
  Combinators = {
    "~": createCombinator("previousSibling", true),
    "+": createCombinator("previousSibling", false),
    ">": createCombinator("parentNode",      false),
    " ": createCombinator("parentNode",      true),
    ",": function(e, parts, index) {
      return matchRestingParts(e, parts, index - 1);
    }
  };
  
  Selectors = [
    // ID selectors, e.g. "#container"
    createSelector(
      /^#([\w\-\*]+)(?:\b|$)/,
      function(id) {
        return function(e) {
          return e.id === id;
        };
      }
    ),
    // Tag name selectors, e.g. "html"
    createSelector(
      /^\s*(\*|[\w\-]+)(?:\b|$)?/,
      function(tagName) {
        if (tagName === "*") return TRUE;
        tagName = tagName.toUpperCase();
        return function(e) {
          console.log("expected: " + tagName);
          console.log("actual:  " + e.tagName);
          return e.tagName.toUpperCase() === tagName;
        };
      }
    ),
    // Class selectors, e.g. ".article"
    createSelector(
      /^\.([\w\-\*]+)(?:\b|$)/,
      function(className) {
        var pattern = new RegExp("(?:^|\\s)" + className + "(?:\\s|$)");
        return function(e) {
          return pattern.test(e.className);
        };
      }
    ),
    // Attributes presence selectors, e.g. "[href]"
    // FIXME: All attribute stuff will obviously not work with IE.
    createSelector(
      /^\[((?:[\w]+:)?[\w]+)\]/,
      function(name) {
        return function(e) {
          return e.hasAttribute(name);
        };
      }
    ),
    // Attributes selectors, e.g. "[href='#']"
    createSelector(
      /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]=|=)\s*(?:(['"])([^\3]*?)\3|([^'"][^\]]*?)))?\]/,
      function(name, operator, quote, arg, arg2) {
        operator = operator[0];
        arg = arg || arg2
        switch(operator) {
          case "~": arg = " " + arg + " ";   break;
          case "|": arg = arg.toLowerCase(); break;
        }
        return function(e) {
          if (!e.hasAttribute(name)) return false;
          var v = e.getAttribute(name);
          switch(operator) {
            case "=": return v === arg;
            case "^": return v.indexOf(arg) === 0;
            case "*": return v.indexOf(arg) !== -1;
            case "~": return (" " + v + " ").indexOf(arg) !== -1;
            case "|": return (v = v.toLowerCase()) === arg || v.indexOf(arg + "-") === 0;
            case "$":
              var i = v.length - arg.length;
              return i >= 0 && v.lastIndexOf(arg) === i;
          }
        };
      }
    ),
    // Pseudo selectors, e.g. ":first-child", ":not(a)"
    createSelector(
      /^:(\w[\w-]*)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/,
      function(name, arg) {
        if (!(name in Pseudos)) {
          throw "Unsupported pseudo selector: " + pseudo;
        }
        pseudo = Pseudos[name];
        return pseudo.hasArgument === TRUE ? pseudo.getPredicate(arg) : pseudo;
      }
    )
  ];
  
  Pseudos = {
    // Read: “ "not" is a pseudo whose argument is an expression ”
    "not": createPseudoWithArgument(function(expression) {
      var matcher = createMatcher(expression);
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
    match: match,

    /**
     *  @param   {String}   name    The name of the pseudo-selector
     *  @param   {Function} selector The selector
     *  @returns {void}
     *  @example
     *    Bouncer.registerPseudo("checked", function(element) {
     *      return element.checked;
     *    });
     *    Bouncer.match(document.forms.new_post.draft, ":checked");
    **/
    registerPseudo: function(name, selector) {
      Pseudos[name] = selector;
    },

    /**
     *  @param   {String}   name      The name of the pseudo-selector
     *  @param   {Function} generator The generator that should return a selector
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
      Pseudos[name] = createPseudoWithArgument(generator);
    }
  };
})();