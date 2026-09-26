export interface LanguageConfig {
  id: string; // Monaco language ID
  name: string; // Display name
  pistonLanguage: string; // Piston API language runtime
  pistonVersion?: string;
  defaultExtension: string;
  extensions: string[];
  sampleCode: string;
  isRunnable: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: "python",
    name: "Python 3",
    pistonLanguage: "python",
    pistonVersion: "3.10.0",
    defaultExtension: ".py",
    extensions: [".py", ".pyw", ".pyi"],
    isRunnable: true,
    sampleCode: `# Welcome to CodePad (Python 3)
def greet(name: str) -> str:
    return f"Hello, {name}! 🚀"

def main():
    print("=" * 35)
    print("Welcome to CodePad Python Environment")
    print("=" * 35)
    
    user = "Developer"
    message = greet(user)
    print(message)
    
    # Calculate Fibonacci numbers
    fib = [0, 1]
    for i in range(2, 10):
        fib.append(fib[-1] + fib[-2])
    print(f"Fibonacci sequence: {fib}")

if __name__ == "__main__":
    main()
`,
  },
  {
    id: "javascript",
    name: "JavaScript (Node.js)",
    pistonLanguage: "javascript",
    pistonVersion: "18.15.0",
    defaultExtension: ".js",
    extensions: [".js", ".mjs", ".cjs"],
    isRunnable: true,
    sampleCode: `// Welcome to CodePad (JavaScript)
function calculateStats(numbers) {
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / numbers.length;
  const max = Math.max(...numbers);
  const min = Math.min(...numbers);
  return { sum, avg, max, min };
}

console.log("🚀 CodePad JS Runtime Active!");
const data = [12, 45, 67, 23, 89, 34, 91, 15];
const stats = calculateStats(data);

console.log("Input Array:", data);
console.log("Computed Stats:", JSON.stringify(stats, null, 2));
`,
  },
  {
    id: "typescript",
    name: "TypeScript",
    pistonLanguage: "typescript",
    pistonVersion: "5.0.3",
    defaultExtension: ".ts",
    extensions: [".ts", ".tsx"],
    isRunnable: true,
    sampleCode: `// Welcome to CodePad (TypeScript)
interface User {
  id: number;
  name: string;
  role: "admin" | "developer" | "viewer";
  skills: string[];
}

const user: User = {
  id: 101,
  name: "Alex",
  role: "developer",
  skills: ["TypeScript", "Next.js", "Monaco", "Python"]
};

console.log(\`User \${user.name} (\${user.role}) has skills: \${user.skills.join(", ")}\`);
`,
  },
  {
    id: "html",
    name: "HTML5",
    pistonLanguage: "html",
    defaultExtension: ".html",
    extensions: [".html", ".htm"],
    isRunnable: true, // We can run HTML via in-browser iframe preview!
    sampleCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodePad Web Preview</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 30px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>🚀 CodePad Live Preview</h2>
    <p>Edit this HTML file and press <strong>Run</strong> to see live changes instantly!</p>
    <button onclick="alert('Hello from CodePad!')">Click Me</button>
  </div>
</body>
</html>
`,
  },
  {
    id: "css",
    name: "CSS",
    pistonLanguage: "css",
    defaultExtension: ".css",
    extensions: [".css", ".scss", ".less"],
    isRunnable: false,
    sampleCode: `/* Custom CSS Stylesheet */
:root {
  --primary: #3b82f6;
  --bg-dark: #0f172a;
  --text: #f8fafc;
}

body {
  background-color: var(--bg-dark);
  color: var(--text);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
`,
  },
  {
    id: "cpp",
    name: "C++ (GCC)",
    pistonLanguage: "cpp",
    pistonVersion: "10.2.0",
    defaultExtension: ".cpp",
    extensions: [".cpp", ".cc", ".cxx", ".h", ".hpp"],
    isRunnable: true,
    sampleCode: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "🚀 CodePad C++ Environment\\n";
    std::vector<int> nums = {10, 20, 30, 40, 50};
    int sum = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Sum of elements: " << sum << std::endl;
    return 0;
}
`,
  },
  {
    id: "c",
    name: "C (GCC)",
    pistonLanguage: "c",
    pistonVersion: "10.2.0",
    defaultExtension: ".c",
    extensions: [".c", ".h"],
    isRunnable: true,
    sampleCode: `#include <stdio.h>

int main() {
    printf("🚀 Hello from CodePad C Compiler!\\n");
    for (int i = 1; i <= 5; i++) {
        printf("Iteration #%d: Square = %d\\n", i, i * i);
    }
    return 0;
}
`,
  },
  {
    id: "rust",
    name: "Rust",
    pistonLanguage: "rust",
    pistonVersion: "1.68.2",
    defaultExtension: ".rs",
    extensions: [".rs"],
    isRunnable: true,
    sampleCode: `fn main() {
    println!("🚀 Hello from CodePad Rust Runner!");
    let primes = vec![2, 3, 5, 7, 11, 13, 17, 19];
    let sum: i32 = primes.iter().sum();
    println!("Sum of first {} primes: {}", primes.len(), sum);
}
`,
  },
  {
    id: "json",
    name: "JSON",
    pistonLanguage: "json",
    defaultExtension: ".json",
    extensions: [".json"],
    isRunnable: false,
    sampleCode: `{
  "name": "codepad-workspace",
  "version": "1.0.0",
  "features": [
    "Monaco Editor",
    "Neon DB Sync",
    "Piston Sandbox Execution",
    "GitHub Integration",
    "Per-File Notepad"
  ]
}
`,
  },
  {
    id: "markdown",
    name: "Markdown",
    pistonLanguage: "markdown",
    defaultExtension: ".md",
    extensions: [".md", ".markdown"],
    isRunnable: false,
    sampleCode: `# 📝 Project Notes

Welcome to **CodePad**!

### Features
- ⚡ **Monaco Editor** with VS Code IntelliSense
- 📱 **Mobile-First Layout** with quick-key bar
- 💾 **Neon Postgres Auto-Save** & GitHub push/pull
- 🏃 **Run Code in Sandbox** (Python, JS, C++, Rust, etc.)
- 📋 **Per-File Notepad** for private notes & todos
`,
  },
];

export function getLanguageByFilename(filename: string): LanguageConfig {
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  const match = SUPPORTED_LANGUAGES.find((lang) =>
    lang.extensions.includes(ext)
  );
  return (
    match || {
      id: "plaintext",
      name: "Plain Text",
      pistonLanguage: "plaintext",
      defaultExtension: ".txt",
      extensions: [".txt"],
      sampleCode: "",
      isRunnable: false,
    }
  );
}
