const Handlebars = require("handlebars");

const originalEscape = Handlebars.Utils.escapeExpression;
Handlebars.Utils.escapeExpression = function(value) {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return originalEscape(value);
};

const templateStr = "Hello {{user.name}}! Here is your data: {{user.data}} and raw: {{{user.data}}}";
const context = {
  user: {
    name: "John",
    data: { items: [1, 2, 3] }
  }
};

const compiled = Handlebars.compile(templateStr);
console.log(compiled(context));
