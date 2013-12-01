var X_PATH = {
  "#": "[@id='$0']",
  ".": "[contains(concat(' ', @class, ' '), ' $0 ')]",
  "*": "$0",
  "[": {
    "":  "[@$0]",
    "=": "[@$0 = '$2']",
    "!": "[@$0 != '$2']",
    "^": "[starts-with(@$0, '$2')]",
    "$": "[substring(@$0, (string-length(@$0) - string-length('$2') + 1)) = '$2']",
    "*": "[contains(@$0, '$3')]",
    "~": "[contains(concat(' ', @$0, ' '), ' $2 ')]",
    "|": "[@$0 = '$2' or starts-with(@$0, '$2-')]"
  },
  ":": {
    "first-child": "[not(preceding-sibling::*)]",
    "last-child":  "[not(following-sibling::*)]",
    "empty":       "[count(*) = 0 and (count(text()) = 0)]",
    "enabled":     "[not(@disabled) and (@type != 'hidden')]",
    "disabled":    "[(@disabled) and (@type != 'hidden')]",
    "checked":     "[@checked]",
    "contains":    "[contains(text(), '$1')]"
  },
  " ": "//",
  ">": "/",
  "~": "/following-sibling::*/self::",
  "+": "/following-sibling::*[1]/self::"
};

function createSelectorUsingXPath(expression) {
  expression = "descendant-or-self::" + createXPathExpression(expression);
  return function selectorUsingXPath(context) {
    var elements = getElementsByXPath(context, expression),
        index = indexOf(elements, context);
    if (index !== -1) {
      elements.splice(index, 1);
    }
    return elements;
  };
}

function getElementsByXPath(context, expression) {
  var results = [],
      query = document.evaluate(expression, context || document,
                null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  for (var i = 0, length = query.snapshotLength; i < length; i++)
    results.push(query.snapshotItem(i));
  return results;
}

function createXPathExpression(expression) {
  var result = Tokenizer.tokenize(expression);
  map(result, createXPathExpressionFromTokens);
  return result.join("|");
}

function createXPathExpressionFromTokens(tokens) {
  var i = 0, result = "", tagNameProvided = false, token;
  
  while (token = tokens[i++]) {
    var symbol = token.symbol, part = X_PATH[symbol];
    
    switch (symbol) {
      case "*": tagNameProvided = true; break;
      case "[": part = part[(token.captures[1] || "").charAt(0)]; break;
      case ":":
        part = part[token.captures[0]];
        if (typeof part === "function") {
          part = part(token.captures[1]);
        }
    }
    
    if (!tagNameProvided) {
      result += "*";
      tagNameProvided = true;
    }
    
    if (token.symbol in COMBINATORS) {
      tagNameProvided = false;
    }
    
    result += interpolate(part, map(token.captures, escapeSingleQuotes));
  }
  
  return result;
}
