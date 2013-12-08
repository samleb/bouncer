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

// function isDescendantOf_usingContains(element, presumedAncestor) {
//   return presumedAncestor.contains(element);
// }
// 
// function isDescendantOf_usingCompareDocumentPosition(element, presumedAncestor) {
//   return element.compareDocumentPosition(presumedAncestor) & Node.DOCUMENT_POSITION_CONTAINS;
// }
// 
// function isDescendantOf_followingParentNodes(element, presumedAncestor) {
//   while (element = element.parentNode) {
//     if (element === presumedAncestor) return true;
//   }
//   return false;
// }
// 
// var isDescendantOf;
// 
// if (A_ELEMENT.contains) {
//   isDescendantOf = isDescendantOf_usingContains;
// } else if (A_ELEMENT.compareDocumentPosition) {
//   isDescendantOf = isDescendantOf_usingCompareDocumentPosition;
// } else {
//   isDescendantOf = isDescendantOf_followingParentNodes;
// }

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
