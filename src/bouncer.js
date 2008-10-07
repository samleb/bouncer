/**
 *  Bouncer
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

var Bouncer = (function() {

  var Combinators,
      Rules,
      Attributes,
      Pseudos,
      Cache = { };

  Combinators = {
    Patterns: {
      child:      /^\s*>\s*/,
      adjacent:   /^\s*\+\s*/,
      later:      /^\s*~\s*/,
      descendant: /^\s+/
    },

    Handlers: {
      // A B
      descendant: function(matcher) {
        return function(e) {
          while ((e = e.parentNode).nodeType === 1) {
            if (matcher(e)) return e;
          }
          return false;
        };
      },
      // A > B
      child: function(matcher) {
        return function(e) {
          return (e = e.parentNode).nodeType === 1 && matcher(e) && e;
        };
      },
      // A + B
      adjacent: function(matcher) {
        return function(e) {
          while ((e = e.previousSibling)) {
            if (e.nodeType === 1) return matcher(e) && e;
          }
          return false;
        };
      },
      // A ~ B
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

  Rules = {
    Patterns: {
      id:        /^#([\w\-\*]+)(?:\b|$)/,
      tagName:   /^\s*(\*|[\w\-]+)(?:\b|$)?/,
      className: /^\.([\w\-\*]+)(?:\b|$)/,
      pseudo:    /^:(\w[\w-]*)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/,
      attrPresence: /^\[((?:[\w]+:)?[\w]+)\]/,
      attr:         /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/
    },

    Handlers: {
      id: function(match) {
        var id = match[1];
        return function(e) {
          return e.id === id;
        };
      },
      tagName: function(match) {
        var tagName = match[1];
        if (tagName === '*') return True;
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
          throw 'Unsupported pseudo selector: ' + pseudo;
        } else {
          pseudo = Pseudos[pseudo];
          return pseudo.hasArgument ? pseudo(match[2]) : pseudo;
        }
      },
      attrPresence: function(match) {
        var name = match[1];
        return function(e) {
          return e.hasAttribute(name);
        };
      },
      attr: function(match) {
        var name     = match[1],
            operator = match[2],
            value    = match[5] || match[6];
        
        if (operator == '~=') {
          value = ' ' + value + ' ';
        }
        operator = Attributes[operator];
        
        return function(e) {
          return operator(e.getAttribute(name), value);
        };
      }
    }
  };
  
  Attributes = {
    '=':  function(v, a) { return v === a; },
    '!=': function(v, a) { return v !== a; },
    '^=': function(v, a) { return v.indexOf(a) == 0; },
    '$=': function(v, a) { throw "operator $= not implemented yet"; },
    '*=': function(v, a) { return v.indexOf(a) >= 0; },
    '~=': function(v, a) { return (' ' + a + ' ').indexOf(v) >= 0; }
  };

  Pseudos = {
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

  function True() {
    return true;
  }
  
  function pseudoWithArgument(handler) {
    handler.hasArgument = true;
    return handler;
  }

  function assembleMatcher(expression) {
    var matcher, patterns, handlers, rest, match, found;

    while (expression && rest !== expression && (/\S/).test(expression)) {
      rest = expression, found = false;

      patterns = Combinators.Patterns, handlers = Combinators.Handlers;
      for (var name in patterns) {
        if ((match = expression.match(patterns[name]))) {
          matcher = handlers[name](matcher);
          found = true;
          break;
        }
      }
      
      if (!found) {
        patterns = Rules.Patterns, handlers = Rules.Handlers;
        for (var name in patterns) {
          if ((match = expression.match(patterns[name]))) {
            matcher = combineMatchers(handlers[name](match), matcher);
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        throw 'Unkown CSS expression: ' + expression;
      }
      
      expression = expression.replace(match[0], '');
    }

    return matcher;
  }

  function combineMatchers(matcher1, matcher2) {
    if (!matcher2) return matcher1;
    return function(element) {
      var result = matcher1(element);
      return result && matcher2(result === true ? element : result);
    };
  }

  return {
    match: function(element, expression) {
      if (!(expression in Cache)) {
        Cache[expression] = assembleMatcher(expression);
      }
      return Cache[expression](element);
    },

    registerPseudoWithArgument: function(name, handler) {
      Pseudos[name] = pseudoWithArgument(handler);
    },

    registerPseudo: function(name, handler) {
      Pseudos[name] = handler
    }
  };
})();