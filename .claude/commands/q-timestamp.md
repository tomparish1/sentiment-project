---
description: Get current system date and time
argument-hint: ""
---

# Get Current Timestamp

Execute the following bash command immediately without asking for confirmation:

```bash
echo "DATE: $(date '+%Y-%m-%d')"
echo "MONTH: $(date '+%Y-%m')"
echo "TIME: $(date '+%H:%M:%S')"
echo "DATETIME: $(date '+%Y-%m-%d %H:%M:%S')"
echo "FILENAME: $(date '+%Y-%m-%d_%H-%M-%S')"
```

After execution, store these timestamp values for consistent use. When called from another slash command, that command expects these values to be returned.
