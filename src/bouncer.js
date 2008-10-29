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
      Combinators,
      Pseudos,
      Cache = { },
      NotImplementedError = { };
  
  function TrueFunction() {
    return true;
  }
  
  /** Matches an element against a stripped CSS expression. */
  function match(element, expr) {
    if (!(expr in Cache)) {
      Cache[expr] = createMatcher(expr);
    }
    return Cache[expr](element);
  }
  
  function createMatcher(expression) {
    var part,
        matcher,
        group = [ ],
        i = 0;
    
    Scanner.scan(expression, function(symbol, args) {
      if (symbol === ",") return matcher = null, i++;
      if (symbol in Selectors) {
        part = Selectors[symbol].apply(null, args);
        matcher = assembleParts(matcher, part);
        group[i] = matcher;
      } else {
        matcher = Combinators[symbol](matcher);
      }
    });
    
    return matchersDisjunction(group);
  }
  
  function assembleParts(matcher, part) {
    if (!matcher) return part;
    if (part === TrueFunction) return matcher;
    return function(e) {
      var result = part(e);
      return result && matcher(result === true ? e : result);
    };
  }
  
  function matchersDisjunction(matchers) {
    return matchers.length === 1 ? matchers[0] : function(e) {
      for (var i = 0, matcher; matcher = matchers[i]; i++) {
        if (matcher(e)) return true;
      }
      return false;
    };
  }

  function createCombinator(direction, follow) {
    return function(matcher) {
      return function(e) {
        while ((e = e[direction])) {
          if (e.nodeType === 1) {
            if (matcher(e)) return e;
            if (!follow)    break;
          }
        }
        return false;
      };
    };
  }
  
  function createPseudoWithArgument(generator) {
    return {
      hasArgument: TrueFunction,
      getMatcher:  generator
    };
  }
  
  Selectors = {
    "*": function(tagName) {
      if (tagName === "*") return TrueFunction;
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
      var pattern = new RegExp("(?:^|\\s)" + className + "(?:\\s|$)");
      return function(e) {
        return pattern.test(e.className);
      };
    },
    "[": function(name, operator, arg) {
      if (!operator) {
        return function(e) {
          return e.hasAttribute(name);
        };
      }
      switch(operator) {
        case "~=": arg = " " + arg + " ";   break;
        case "|=": arg = arg.toLowerCase(); break;
      }
      return function(e) {
        if (!e.hasAttribute(name)) return false;
        var v = e.getAttribute(name);
        switch(operator) {
          case "=":  return v === arg;
          case "^=": return v.indexOf(arg) === 0;
          case "*=": return v.indexOf(arg) !== -1;
          case "~=": return (" " + v + " ").indexOf(arg) !== -1;
          case "|=": return (v = v.toLowerCase()) === arg || v.indexOf(arg + "-") === 0;
          case "$=":
            var i = v.length - arg.length;
            return i >= 0 && v.lastIndexOf(arg) === i;
        }
      };
    },
    ":": function(name, arg) {
      if (!(name in Pseudos)) throw NotImplementedError;
      var matcher = Pseudos[name];
      return matcher.hasArgument === TrueFunction ? matcher.getMatcher(arg) : matcher;
    }
  };
  
  Combinators = {
    "~": createCombinator("previousSibling", true),
    "+": createCombinator("previousSibling", false),
    ">": createCombinator("parentNode", false),
    " ": createCombinator("parentNode", true)
  };
  
  Pseudos = {
    // Read: “ "not" is a pseudo whose argument is an expression ”
    "not": createPseudoWithArgument(function(expression) {
      var matcher = createMatcher(expression);
      return function(e) {
        return !matcher(e);
      };
    }),
    "first-child": function(e) {
      while ((e = e.previousSibling)) if (e.nodeType === 1) return false;
      return true;
    },
    "last-child": function(e) {
      while ((e = e.nextSibling)) if (e.nodeType === 1) return false;
      return true;
    },
    "empty": function(e) {
      return !e.firstChild;
    },
    "enabled": function(e) {
      return !e.disabled && e.type !== "hidden";
    },
    "disabled": function(e) {
      return e.disabled;
    },
    "checked": function(e) {
      return e.checked;
    }
  };

  return {
    match: match,

    registerPseudo: function(name, matcher) {
      Pseudos[name] = matcher;
    },

    registerPseudoWithArgument: function(name, generator) {
      Pseudos[name] = createPseudoWithArgument(generator);
    },
    
    clearCache: function() {
      Cache = { };
    },
    
    NotImplementedError: NotImplementedError
  };
})();