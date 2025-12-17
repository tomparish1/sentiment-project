---
description: Create development session log
argument-hint: ""
---

# Dump Session Log

Create a development session log:

1. **Get current timestamp** (run these bash commands):
   ```bash
   date '+%Y-%m'          # MONTH (for directory)
   date '+%Y-%m-%d_%H-%M-%S'  # FILENAME (for file)
   ```

2. **Create the file:**
   - Directory: `docs/sessions/ABC/` (where `ABC` is MONTH from step 1)
   - Filename: `XYZ Dev.md` (where `XYZ` is FILENAME from step 1)
   - Example: `docs/sessions/2025-11/2025-11-21_12-15-34 Dev.md`

3. In the file, document the current conversation session in chronological order:
   - Each user command/prompt
   - A concise summary of the corresponding action taken or answer provided by Claude

4. Format the content as a clear development log/transcript of the session

5. Do not include code blocks, just reference the effect the code block has in light of the choices the user or you (ClaudeCode) proposes
