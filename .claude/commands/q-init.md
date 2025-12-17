---
description: Initialize a new Coding project
argument-hint: ""
---

** IMPORTANT ** determine if the folder `/docs/sessions` exists and if it does abort the rest of these instructions and tell the user that the folder already has a `/docs/sessions` folder

** NOTE ** operationally, this /q-init slash command would only be issued once per project just after a folder has been initialized using the /init slasj=h command

# Create the following folders
1. /docs
2. /docs/sessions
3. /docs/reference
4. /test-data
5. /scripts

# Create the following files
1. /PLAN.md
2. /COMPLETED_PLAN.md
3. /docs/reference/CLI-REFERENCE.md
4. /docs/reference/CLI-QUICKREF.md
5. /docs/reference/CLI-TESTING.md

# Intent for each file
1. PLAN.md
- this file is used to keep track of a sequential plan to achieve the goal of this project (folder)
- it will show as many steps as are needed to achieve a forthcoming user-described plan
- as steps are added, removed, subdivided anywhere in the Plan, the steps will re-number themselves to keep the numbers sequential and ascending
- the plan will act as a "where are we in the plan" document. You should be able to open the PLAN.md and quickly tell what work is in-progress (if any), and what is the next step
- any step in the plan can be broken into smaller pieces that are executable by you (Claude Code) or by the user
- **When a step is completed:**
  1. Move the full step details (sub-tasks, deliverables, notes) to COMPLETED_PLAN.md
  2. In PLAN.md, replace with a summary showing only: Step Name, Step Purpose, Status: COMPLETE
  3. This preserves context for orientation while keeping PLAN.md scannable

2. COMPLETED_PLAN.md
- this file contains the full details of completed plan steps
- when steps in PLAN.md are marked complete, their detailed content is moved here
- organized chronologically by step number
- serves as project history and reference for understanding past decisions

3. CLI-REFERENCE.md
- this file contains any CLI executable steps (usually found in the package.json file) but their options, purpose and outcomes are documented in detail here
- examples should be given of each CLI command with brief explanations of what they do and why to use them
- the user will initiate a check for changes as part of the /q-docs slash command

4. CLI-QUICKREF.md
- this file is a brief summary of the often-used CLI commands and briefly what options they use in those case
- you must maintain the connection between CLI-QUICKREF.md and CLI-REFERENCE.md whenever either of them changes, as applicable
- the user will initiate a check for changes as part of the /q-docs slash command

5. CLI-TESTING.md
- this file contains details of all tests that have been set up for this project
- whenever a test is added, changed or removed, this should trigger an update be made to this file
- the user will initiate a check for changes as part of the /q-docs slash command
