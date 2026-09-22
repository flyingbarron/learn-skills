let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let prompt = "";
try {
  const input = JSON.parse(raw);
  prompt = input.prompt || "";
} catch (e) {
  // fallback if raw format differs
}

// Build a context-aware gate instruction that includes the first 300 chars
// of the user prompt so the model can classify the task type immediately.
const promptSnippet = prompt.length > 0
  ? `\n\nUser request (first 300 chars): "${prompt.slice(0, 300).replace(/"/g, "'")}"`
  : "";

const instruction = `[PRE-TASK AWARENESS GATE]
Before generating code or executing changes for the user's request:
1. Analyze the mission using the 'code-awareness' skill (classify task type, identify touched risk surfaces).
2. Check local installed skills and discover relevant free vs. paid ecosystem capabilities if gaps exist.
3. If reusable capability gaps exist, draft/install the missing skill or advise the user.${promptSnippet}`;

process.stdout.write(instruction);
process.exit(0);
