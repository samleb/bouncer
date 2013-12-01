<% filter_function :firstChildPseudo, :variables => 'sibling' do %>
  condition = true;
  sibling = element;
  while (sibling = sibling.previousSibling) {
    if (sibling.nodeType === 1) {
      condition = false;
      break;
    }
  }
<% end %>

<% filter_function :lastChildPseudo, :variables => 'sibling' do %>
  condition = true;
  sibling = element;
  while (sibling = sibling.nextSibling) {
    if (sibling.nodeType === 1) {
      condition = false;
      break;
    }
  }
<% end %>

function onlyChildPseudoFilter(elements) {
  return lastChildPseudoFilter(firstChildPseudoFilter(elements));
}

<% filter_function :emptyPseudo, '!element.firstChild' %>
<% filter_function :enabledPseudo, '!element.disabled && element.type !== "hidden"' %>
<% filter_function :disabledPseudo, 'element.disabled' %>
<% filter_function :checkedPseudo, 'element.checked' %>

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
    
    <% filter_function :notPseudoComplementary, '!((element.uniqueID || element.__bouncerKey__) in hash)' %>
    
    return notPseudoComplementaryFilter(elements);
  };
}

function createContainsPseudoFilter(string) {
  return <% filter_function :containsPseudo, :variables => 'text' do %>
    text = element.textContent || element.innerText;
    condition = text === string || text && text.indexOf(string) !== -1;
  <% end %>;
}
