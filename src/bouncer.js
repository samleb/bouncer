// 
//  bouncer.js
//  Bouncer
//  
//  Created by Samuel Lebeau on 2008-08-27.
//  Copyright 2008 xilinus. All rights reserved.
// 

var Bouncer = (function() {
  
  var Combinators, Rules, Pseudos, Cache = { };
  
  Combinators = {
    Patterns: {
      child:      /^\s*>\s*/,
      adjacent:   /^\s*\+\s*/,
      later:      /^\s*~\s*/,
      any:        /^\s*,\s*/,
      descendant: /^\s+/
    },
    
    Handlers: {
      // lhs rhs
      descendant: function(lhs, rhs) {
        return function(element) {
          if (rhs(element)) {
            while ((element = element.parentNode) && element.nodeType === 1) {
              if (lhs(element)) return true;
            }
          }
          return false;
        }
      },
      // lhs > rhs
      child: function(lhs, rhs) {
        return function(element) {
          if (rhs(element) && (element = element.parentNode) && element.nodeType === 1) {
            return lhs(element);
          }
          return false;
        }
      },
      // lhs + rhs
      adjacent: function(lhs, rhs) {
        return function(element) {
          if (rhs(element)) {
            while ((element = element.previousSibling)) {
              if (element.nodeType === 1) return lhs(element);
            }
          }
          return false;
        };
      },
      // lhs ~ rhs
      later: function(lhs, rhs) {
        return function(element) {
          if (rhs(element)) {
            while ((element = element.previousSibling)) {
              if (element.nodeType === 1 && lhs(element)) return true;
            }
          }
          return false;
        }
      },
      // lhs, rhs
      any: function(lhs, rhs) {
        return function(element) {
          return lhs(element) || rhs(element);
        }
      }
    }
  };
  
  Rules = {
    Patterns: {
      id:        /^#([\w\-\*]+)(?:\b|$)/,
      tagName:   /^\s*(\*|[\w\-]+)(?:\b|$)?/,
      className: /^\.([\w\-\*]+)(?:\b|$)/,
      pseudo:    /^:((?:first|last)(?:-child)|not)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/
    },
    
    Handlers: {
      id: function(match) {
        var id = match[1];
        return function(element) {
          return element.getAttribute('id') === id;
        }
      },
      tagName: function(match) {
        var tagName = match[1];
        if (tagName === '*') return True;
        tagName = tagName.toLowerCase();
        return function(element) {
          return element.tagName.toLowerCase() === tagName;
        };
      },
      className: function(match) {
        var className = ' ' + match[1] + ' ';
        return function(element) {
          return (' ' + element.className + ' ').indexOf(className) > -1;
        }
      },
      pseudo: function(match) {
        var pseudo = match[1];
        if ( !(pseudo in Pseudos) ) {
          throw  'Unsupported pseudo selector: ' + pseudo;
        } else {
          return Pseudos[pseudo](match);
        }
      }
    }
  };
  
  Pseudos = {
    'not': function(match) {
      var matcher = compileMatcher(match[2]);
      return function(element) {
        return !matcher(element);
      };
    }
  };
  
  function True() {
    return true;
  }
  
  function joinPredicates(predicates) {
    if (predicates.length === 1) {
      return predicates[0];
    }
    return function(element) {
      var predicate, i = 0;
      while ((predicate = predicates[i++])) {
        if (!predicate(element)) return false;
      }
      return true;
    };
  }
  
  function compileMatcher(expression) {
    var i, l, name, match, predicate, rest, lhs, rhs, predicates = [];
    
    var patterns, handlers;
    
    while (expression && rest != expression && (/\S/).test(expression)) {
      rest = expression;
      
      patterns = Combinators.Patterns;
      handlers = Combinators.Handlers;
      
      for (name in patterns) {
        if ((match = expression.match(patterns[name]))) {
          lhs = joinPredicates(predicates);
          rhs = compileMatcher(expression.slice(match[0].length));
          return handlers[name](lhs, rhs);
        }
      }
      
      patterns = Rules.Patterns;
      handlers = Rules.Handlers;
      
      for (name in patterns) {
        if ((match = expression.match(patterns[name]))) {
          predicates.push(handlers[name](match));
          expression = expression.replace(match[0], '');
          break;
        }
      }
    }
    
    return joinPredicates(predicates);
  }
  
  return {
    match: function(element, expression) {
      if (expression in Cache) return Cache[expression](element);
      Cache[expression] = compileMatcher(expression);
      return Cache[expression](element);
    },
    
    registerPseudo: function(name, predicateMaker) {
      Pseudos[name] = predicateMaker;
    }
  };
})();