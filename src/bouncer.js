// 
//  bouncer.js
//  Bouncer
//  
//  Created by Samuel Lebeau on 2008-08-27.
//  Copyright 2008 Samuel Lebeau. All rights reserved.
// 

var Bouncer = (function() {
  
  var Combinators,
      Rules,
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
      pseudo:    /^:([\w-]+)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/
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
          return Pseudos[pseudo](match[2]);
        }
      }
    }
  };
  
  Pseudos = {
    not: function(expression) {
      var matcher = assembleMatcher(expression);
      return function(e) {
        return !matcher(e);
      };
    }
  };
  
  function True() {
    return true;
  }
  
  function assembleMatcher(expression) {
    var matcher, patterns, handlers, rest, match;
    
    while (expression && rest !== expression && (/\S/).test(expression)) {
      rest = expression;
      
      patterns = Combinators.Patterns, handlers = Combinators.Handlers;
      for (var name in patterns) {
        if ((match = expression.match(patterns[name]))) {
          matcher = handlers[name](matcher);
          expression = expression.replace(match[0], '');
          break;
        }
      }
      
      patterns = Rules.Patterns, handlers = Rules.Handlers;
      for (var name in patterns) {
        if ((match = expression.match(patterns[name]))) {
          matcher = combineMatchers(handlers[name](match), matcher);
          expression = expression.replace(match[0], '');
          break;
        }
      }
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
  
  window.Cache = Cache;
  window.Pseudos = Pseudos;
  
  return {
    match: function(element, expression) {
      if (!(expression in Cache)) {
        Cache[expression] = assembleMatcher(expression);
        if (expression == ':test')
          console.debug(Cache[expression]);
      }
      return Cache[expression](element);
    },
    
    registerPseudoWithClosure: function(name, predicateClosure) {
      Pseudos[name] = predicateClosure;
    },
    
    registerPseudo: function(name, predicate) {
      Pseudos[name] = function() {
        return predicate;
      };
    }
  };
})();