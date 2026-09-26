/**
 * Monaco Editor completion and hover providers for Python, JS, HTML, CSS, C++, Rust
 */
export function registerLanguageProviders(monaco: any) {
  if (!monaco || (monaco as any).__codepadProvidersRegistered) return;
  (monaco as any).__codepadProvidersRegistered = true;

  // Python Completion Provider
  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        {
          label: "def function",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "def ${1:function_name}(${2:params}):\n    ${0:pass}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a new function with parameters and body",
          range,
        },
        {
          label: "if __name__ == '__main__'",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "if __name__ == \"__main__\":\n    ${0:main()}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Standard Python entrypoint boilerplate",
          range,
        },
        {
          label: "class",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "class ${1:ClassName}:\n    def __init__(self, ${2:params}):\n        ${0:pass}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a class with __init__ constructor",
          range,
        },
        {
          label: "for in range",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "for ${1:i} in range(${2:10}):\n    ${0:print(i)}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Iterate over a numeric range",
          range,
        },
        {
          label: "try...except",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${0:print(e)}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Try-except error handling block",
          range,
        },
        {
          label: "list comprehension",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "[${1:x} for ${1:x} in ${2:iterable} if ${3:condition}]",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Python list comprehension expression",
          range,
        },
        {
          label: "print",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "print(${1:message})",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Print values to the console stream",
          range,
        },
        {
          label: "import",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "import ${1:module}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Import a module into the current namespace",
          range,
        },
      ];

      return { suggestions };
    },
  });

  // Python Hover Provider
  monaco.languages.registerHoverProvider("python", {
    provideHover: (model: any, position: any) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const hints: Record<string, string> = {
        print: "```python\nprint(*objects, sep=' ', end='\\n', file=None, flush=False)\n```\nPrints values to a stream or sys.stdout by default.",
        len: "```python\nlen(s) -> int\n```\nReturn the number of items in a container (list, tuple, string, dict, set).",
        range: "```python\nrange(stop) -> range object\nrange(start, stop[, step]) -> range object\n```\nReturn a sequence of numbers from start to stop by step.",
        sum: "```python\nsum(iterable, /, start=0) -> number\n```\nReturn the sum of all elements in an iterable plus the start value.",
        map: "```python\nmap(func, *iterables) -> map object\n```\nMake an iterator that computes the function using arguments from each of the iterables.",
        filter: "```python\nfilter(function_or_none, iterable) -> filter object\n```\nReturn an iterator yielding those items of iterable for which function(item) is true.",
      };

      if (hints[word.word]) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [{ value: hints[word.word] }],
        };
      }
      return null;
    },
  });

  // JavaScript / TypeScript Completion Provider
  const jsSnippets = [
    {
      label: "clg (console.log)",
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: "console.log(${1:item});",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Log output to the browser / Node console",
    },
    {
      label: "afn (arrow function)",
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: "const ${1:name} = (${2:params}) => {\n  ${0}\n};",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Create an arrow function constant",
    },
    {
      label: "async function",
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: "async function ${1:name}(${2:params}) {\n  ${0}\n}",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Declare an asynchronous function",
    },
    {
      label: "fetch api call",
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText:
        "const res = await fetch('${1:https://api.example.com}');\nconst data = await res.json();\nconsole.log(data);",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Async fetch JSON request pattern",
    },
    {
      label: "try...catch",
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText:
        "try {\n  ${1}\n} catch (error) {\n  console.error(error);\n}",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Try-catch exception handling block",
    },
  ];

  ["javascript", "typescript"].forEach((lang) => {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: jsSnippets.map((s) => ({ ...s, range })),
        };
      },
    });
  });

  // HTML Completion Provider
  monaco.languages.registerCompletionItemProvider("html", {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        {
          label: "html:5 boilerplate",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>${1:Document}</title>\n</head>\n<body>\n  ${0}\n</body>\n</html>",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Standard HTML5 Starter Document",
          range,
        },
        {
          label: "div.container",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "<div class=\"${1:container}\">\n  ${0}\n</div>",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Div with CSS class",
          range,
        },
        {
          label: "button",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "<button type=\"${1:button}\" onclick=\"${2:handleClick()}\">${3:Click}</button>",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "HTML Button Element",
          range,
        },
      ];

      return { suggestions };
    },
  });
}
