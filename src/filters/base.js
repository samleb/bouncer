function createIdFilter(id) {
  return <% filter_function :id, "element.id === id" %>;
}

function createTagNameFilter(tagName) {
  if (tagName === "*") return IDENTITY;
  if (UPPERCASE_TAG_NAMES) {
    tagName = tagName.toUpperCase();
  }
  return <% filter_function :tagName, "element.tagName === tagName" %>;
}

function createClassNameFilter(className) {
  var pattern = createSpaceSeparatedWordRegExp(className);
  return <% filter_function :className, "pattern.test(element.className)" %>;
}

function createAttributeFilter(name, operator, arg) {
  if (!operator) {
    return createAttributePresenceFilter(name);
  }
  
  switch (operator = operator.charAt(0)) {
    case "~": arg = createSpaceSeparatedWordRegExp(arg); break;
    case "|": arg = arg.toLowerCase();
  }
  
  return <% filter_function :attribute, :condition_variable => "c", :variables => "val" do %>
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
  <% end %>;
}

function createAttributePresenceFilter(name) {
  return <% filter_function :attributePresence, "element.hasAttribute(name)" %>;
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
