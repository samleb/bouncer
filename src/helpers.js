function IDENTITY(x) {
  return x;
}

function indexOf(array, element) {
  var i = array.length;
  // As we're only manipulating duplicate-free arrays here, reverse looping is OK.
  while (i--) {
    if (array[i] === element) return i;
  }
  return -1;
}

function toArray(list) {
  var result = [], i = list.length;
  while (i--) result[i] = list[i];
  return result;
}

function map(array, callback) {
  for (var i = 0, l = array.length; i < l; i++)
    array[i] = callback(array[i]);
  return array;
}

function createSpaceSeparatedWordRegExp(word) {
  return new RegExp("(^|\\s)" + word + "(\\s|$)");
}

function interpolate(expression, values) {
  return expression.replace(/\$(\d+)/g, function(_, index) {
    return values[index];
  });
}

function escapeSingleQuotes(string) {
  return string && string.replace(/'/g, "\\'");
}

function isDescendantOf_usingContains(element, presumedAncestor) {
  return presumedAncestor.contains(element);
}

function isDescendantOf_usingCompareDocumentPosition(element, presumedAncestor) {
  return element.compareDocumentPosition(presumedAncestor) & Node.DOCUMENT_POSITION_CONTAINS;
}

function isDescendantOf_followingParentNodes(element, presumedAncestor) {
  while (element = element.parentNode) {
    if (element === presumedAncestor) return true;
  }
  return false;
}

var isDescendantOf;

if (A_ELEMENT.contains) {
  isDescendantOf = isDescendantOf_usingContains;
} else if (A_ELEMENT.compareDocumentPosition) {
  isDescendantOf = isDescendantOf_usingCompareDocumentPosition;
} else {
  isDescendantOf = isDescendantOf_followingParentNodes;
}

function comparePosition_usingSourceIndex(a, b) {
  return a.sourceIndex - b.sourceIndex;
}

function comparePosition_usingCompareDocumentPosition(a, b) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

var comparePosition;

if (A_ELEMENT.sourceIndex) {
  comparePosition = comparePosition_usingSourceIndex;
} else if (A_ELEMENT.compareDocumentPosition) {
  comparePosition = comparePosition_usingCompareDocumentPosition;
}
