/*! Bouncer v0.2.0-alpha+5c01586428375d09832eb7237715892e1e57f0e7, Copyright (c) 2008-2013 Samuel Lebeau */
(function(GLOBAL, document, undefined) {
  "use strict";

  var Bouncer = { };

  var SELECTORS_CACHE = { },
      UNIQUE_ID = 0,
      A_ELEMENT = document.createElement("a"),
      UPPERCASE_TAG_NAMES = A_ELEMENT.tagName === "A",
      HAS_GET_ELEMENTS_BY_CLASS_NAME = A_ELEMENT.getElementsByClassName;

function IDENTITY(x) {
  return x;
}

function indexOf(array, element) {
  var i = array.length;
  while (i--) {
    if (array[i] === element) return i;
  }
}

var _slice = [].slice;

function map(array, callback) {
  for (var i = 0, l = array.length; i < l; i++)
    array[i] = callback(array[i]);
  return array;
}

function composeFunctions(functions) {
  if (functions.length === 1) return functions[0];
  return function(x) {
    for (var i = 0, l = functions.length; i < l; i++) {
      x = functions[i](x)
    }
    return x;
  };
}

function createSpaceSeparatedWordRegExp(word) {
  return new RegExp("(^|\\s)" + word + "(\\s|$)");
}


var comparePosition;

if (A_ELEMENT.sourceIndex === -1) {
  comparePosition = comparePosition_usingSourceIndex;
} else if (A_ELEMENT.compareDocumentPosition) {
  comparePosition = comparePosition_usingCompareDocumentPosition;
} else {
  comparePosition = comparePosition_usingMagic
}

function comparePosition_usingSourceIndex(a, b) {
  return a.sourceIndex - b.sourceIndex;
}

function comparePosition_usingCompareDocumentPosition(a, b) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function comparePosition_usingMagic() {
  return 1;
}
var Tokenizer = (function() {
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
function createIdFilter(id) {
  return function idFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = element.id === id;
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  };
}

function createTagNameFilter(tagName) {
  if (tagName === "*") return IDENTITY;
  if (UPPERCASE_TAG_NAMES) {
    tagName = tagName.toUpperCase();
  }
  return function tagNameFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = element.tagName === tagName;
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  };
}

function createClassNameFilter(className) {
  var pattern = createSpaceSeparatedWordRegExp(className);
  return function classNameFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = pattern.test(element.className);
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  };
}

function createAttributeFilter(name, operator, arg) {
  if (!operator) {
    return createAttributePresenceFilter(name);
  }

  switch (operator = operator.charAt(0)) {
    case "~": arg = createSpaceSeparatedWordRegExp(arg); break;
    case "|": arg = arg.toLowerCase();
  }

  return function attributeFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        c, element, val;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;

    if ((val = element.getAttribute(name)) != undefined) {
      switch (operator) {
        case "=": c = val === arg; break;
        case "!": c = val !== arg; break; // Convenient addition, "[a!=b]" := ":not([a=b])"
        case "*": c = val.indexOf(arg) !== -1; break;
        case "^": c = val.indexOf(arg) === 0; break;
        case "$": c = val.length - arg.length >= 0 && val.lastIndexOf(arg) === val.length - arg.length; break;
        case "~": c = arg.test(val); break;
        case "|": c = (val = val.toLowerCase()) === arg || val.indexOf(arg + "-") === 0;
      }
    }
  
      if (c) {
        __result__.push(element);
      }
    }
    return __result__;
  };
}

function createAttributePresenceFilter(name) {
  return function attributePresenceFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = element.hasAttribute(name);
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  };
}

function createPseudoFilter(name, argument) {
  if (argument != undefined) {
    if (name in PSEUDO_FILTERS_WITH_ARGUMENTS) {
      return PSEUDO_FILTERS_WITH_ARGUMENTS[name](argument);
    }
  } else if (name in PSEUDO_FILTERS) {
    return PSEUDO_FILTERS[name];
  }
  throw "Unsupported pseudo: \"" + name + "\"";
}
function createCombinatorFactory(direction, follow) {
  return function createCombinator(filter) {
    return function combinator(elements) {
      var result = [],
          i = 0,
          element;

      while (element = elements[i++]) {
        var relatives = [],
            relative = element;

        while (relative = relative[direction]) {
          if (relative.nodeType === 1) {
            relatives.push(relative);
            if (!follow) break;
          }
        }

        if (filter(relatives).length > 0) {
          result.push(element);
        }
      }

      return result;
    };
  };
}

var onlyChildPseudoFilter = A_ELEMENT.childElementCount === 0 ?
  onlyChild_usingChildElementCount_PseudoFilter :
  onlyChild_composingFirstAndLastChildFilters_PseudoFilter;

function firstChildPseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element, sibling;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;

  condition = true;
  sibling = element;
  while (sibling = sibling.previousSibling) {
    if (sibling.nodeType === 1) {
      condition = false;
      break;
    }
  }

      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }

function lastChildPseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element, sibling;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;

  condition = true;
  sibling = element;
  while (sibling = sibling.nextSibling) {
    if (sibling.nodeType === 1) {
      condition = false;
      break;
    }
  }

      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }

function onlyChild_composingFirstAndLastChildFilters_PseudoFilter(elements) {
  return lastChildPseudoFilter(firstChildPseudoFilter(elements));
}

function onlyChild_usingChildElementCount_PseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = element.parentNode.childElementCount === 1;
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }
function emptyPseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = !element.firstChild;
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }
function enabledPseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = !element.disabled && element.type !== "hidden";
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }
function disabledPseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = element.disabled;
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }
function checkedPseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = element.checked;
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }

function createNotPseudoFilter(expression) {
  var negativeFilter = createFilter(expression);

  return function notPseudoFilter(elements) {
    var unwanted = negativeFilter(elements),
        hash = {},
        i = unwanted.length,
        element,
        key;

    while (element = unwanted[--i]) {
      if (!(key = element.uniqueID)) {
        key = UNIQUE_ID++;
        element.__bouncerKey__ = key;
      }
      hash[key] = element;
    }

    function notPseudoComplementaryFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;
      condition = !((element.uniqueID || element.__bouncerKey__) in hash);
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  }

    return notPseudoComplementaryFilter(elements);
  };
}

function createContainsPseudoFilter(string) {
  return function containsPseudoFilter(elements) {
    var __i__ = 0,
        __result__ = [],
        condition, element, text;
    while (element = elements[__i__++]) {
      if (element.nodeType !== 1) continue;

    text = element.textContent || element.innerText;
    condition = text === string || text && text.indexOf(string) !== -1;
  
      if (condition) {
        __result__.push(element);
      }
    }
    return __result__;
  };
}

function createFilter(expression) {
  var tokens = Tokenizer.tokenize(expression)[0];
  return createFilterFromTokens(tokens);
};

function createFilterFromTokens(tokens) {
  var filters = [],
      i = tokens.length,
      token;

  if (i === 0) return IDENTITY;

  while (token = tokens[--i]) {
    if (token.symbol in COMBINATORS) {
      var filter = createFilterFromTokens(tokens.slice(0, i));
      filters.push(COMBINATORS[token.symbol](filter));
      break;
    } else {
      filters.push(createFilterFromToken(token));
    }
  }

  if (filters.length === 1) return filters[0];

  filters.reverse();

  return function filter(elements) {
    var i = filters.length;
    while (i--) {
      elements = filters[i](elements);
    }
    return elements;
  };
}

function createFilterFromToken(token) {
  return FILTERS[token.symbol].apply(undefined, token.captures);
}

var FILTERS = {
  "#": createIdFilter,
  ".": createClassNameFilter,
  "*": createTagNameFilter,
  "[": createAttributeFilter,
  ":": createPseudoFilter
};

var COMBINATORS = {
  " ": createCombinatorFactory("parentNode", true),
  ">": createCombinatorFactory("parentNode", false),
  "~": createCombinatorFactory("previousSibling", true),
  "+": createCombinatorFactory("previousSibling", false)
};

var PSEUDO_FILTERS = {
  "first-child": firstChildPseudoFilter,
  "last-child": lastChildPseudoFilter,
  "only-child": onlyChildPseudoFilter,
  "empty": emptyPseudoFilter,
  "enabled": enabledPseudoFilter,
  "disabled": disabledPseudoFilter,
  "checked": checkedPseudoFilter
};

var PSEUDO_FILTERS_WITH_ARGUMENTS = {
  "not": createNotPseudoFilter,
  "contains": createContainsPseudoFilter
};
var createClassNameSelector = HAS_GET_ELEMENTS_BY_CLASS_NAME ?
  createClassNameSelector_usingGetElementsByClassName :
  createClassNameSelector_usingClassNameFilter;

var SELECTORS = {
  "#": createIdSelector,
  ".": createClassNameSelector,
  "*": createTagNameSelector,
  "[": createAttributeSelector,
  ":": createPseudoSelector
};

var SELECTORS_SYMBOLS_PRIORITY = HAS_GET_ELEMENTS_BY_CLASS_NAME ? "#.*[:" : "#*.[:";

function createSelector(expression) {
  var result = Tokenizer.tokenize(expression);
  map(result, createSelectorFromTokens);
  return createSelectorFromGroupSelectors(result);
}

function createSelectorFromFilter(filter) {
  return function selectorFromFilter(context) {
    return filter(context.getElementsByTagName("*"));
  };
}

function createSelectorFromTokens(tokens) {
  var seedToken    = findSeedToken(tokens),
      pivot        = indexOf(tokens, seedToken),
      filterTokens = tokens.slice(0, pivot),
      seedSelector = createSelectorFromToken(seedToken),
      token,
      filter,
      combinator,
      restSelector,
      restFilter;

  while ((token = tokens[++pivot]) && !(token.symbol in COMBINATORS)) {
    filterTokens.push(token);
  }

  filter = createFilterFromTokens(filterTokens);

  if (token) {
    tokens = tokens.slice(pivot + 1);

    if (token.symbol === " ") {
      restSelector = createSelectorFromTokens(tokens);
    } else {
      restFilter = createFilterFromTokens(tokens);

      var combinatorTokens = [token];
      for (var i = 0, t; t = tokens[i]; i++) {
        if (t.symbol in COMBINATORS) combinatorTokens.push(t)
      }

      combinator = composeFunctions(map(combinatorTokens, createSelectorCombinator));
    }
  }

  return function selector(context) {
    var result = filter(seedSelector(context));

    if (combinator) {
      result = restFilter(combinator(result));

    } else if (restSelector) {
      var i = 0,
          parents = result,
          children,
          element;
      result = [];
      while (element = parents[i++]) {
        children = restSelector(context);
        result.push.apply(result, children);
      }
    }

    return result;
  };
}

function findSeedToken(tokens) {
  var i = 0, j, symbol, token;

  while (symbol = SELECTORS_SYMBOLS_PRIORITY.charAt(i++)) {
    j = tokens.length;
    while (token = tokens[--j]) {
      if (token.symbol === symbol) break;
    }
    if (token) break;
  }

  return token;
}

function createSelectorFromToken(token) {
  return SELECTORS[token.symbol].apply(undefined, token.captures);
}

function createSelectorFromGroupSelectors(selectors) {
  if (selectors.length === 1) return selectors[0];

  return function(context) {
    var result, selector, i = 1;

    result = selectors[0](context);

    while (selector = selectors[i++]) {
      result.push.apply(result, selector(context));
    }

    return result.sort(comparePosition);
  }
}

var SELECTOR_COMBINATORS = {
  ">": { dir: "firstChild",  fol: true },
  "+": { dir: "nextSibling"            },
  "~": { dir: "nextSibling", fol: true }
};

function createSelectorCombinator(token) {
  var symbol = token.symbol;
  if (symbol === " ") return allChildrenCombinator;

  var combinator = SELECTOR_COMBINATORS[symbol],
      direction = combinator.dir,
      follow = combinator.fol;

  return function(elements) {
    var result = [], i = 0, e;
    while (e = elements[i++]) {
      if (!(e = e[direction])) continue;
      do {
        if (e.nodeType === 1) {
          result.push(e);
          if (!follow) break;
        }
      } while (e = e.nextSibling);
    }
    return result;
  };
}

function allChildrenCombinator(elements) {
  var result = [], i = 0, element;

  while (element = elements[i++]) {
    result.push.apply(result, getElementsBySelector("*", element));
  }

  return result;
}

function createTagNameSelector(tagName) {
  return function tagNameSelector(context) {
    return _slice.call(context.getElementsByTagName(tagName));
  };
}

function createIdSelector(id) {
  return function idSelector(context) {
    return [(context.ownerDocument || context).getElementById(id)];
  };
}

function createClassNameSelector_usingGetElementsByClassName(className) {
  return function classNameSelector(context) {
    return _slice.call(context.getElementsByClassName(className));
  };
}

function createClassNameSelector_usingClassNameFilter(className) {
  return createSelectorFromFilter(createClassNameFilter(className));
}

function createAttributeSelector(name, operator, argument) {
  return createSelectorFromFilter(createAttributeFilter(name, operator, argument));
}

function createPseudoSelector(name, argument) {
  return createSelectorFromFilter(createPseudoFilter(name, argument));
}

  function getElementsBySelector(expression, context) {
    var selector = SELECTORS_CACHE[expression];
    if (!selector) {
      selector = createSelector(expression);
      SELECTORS_CACHE[expression] = selector;
    }
    return selector(context || document);
  }

  Bouncer.createFilter = createFilter;
  Bouncer.createSelector = createSelector;
  Bouncer.getElementsBySelector = getElementsBySelector;

  GLOBAL.Bouncer = Bouncer;
})(this, document);
