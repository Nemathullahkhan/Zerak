const Handlebars = require("handlebars");

const originalEscape = Handlebars.Utils.escapeExpression;
Handlebars.Utils.escapeExpression = function(value) {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return originalEscape(value);
};

const templateStr = "Hello {{user.name}}!\nAll data: {{user.data}}\nLoop:\n{{#each user.data.items}}- {{this}}\n{{/each}}";
const context = {
  user: {
    name: "John",
    data: { items: [1, 2, 3] }
  }
};

const compiled = Handlebars.compile(templateStr);
console.log(compiled(context));
