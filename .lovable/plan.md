

# Import er_master Data from SQL Script

## Task
Execute ~9,473 INSERT statements from the uploaded SQL file into the `er_master` table, skipping any rows that fail and producing a report of all failed rows.

## Approach
1. **Parse the SQL file** — Extract each INSERT statement (one per line, skip comments/blanks)
2. **Execute each INSERT individually** via `psql` — capture success/failure per row
3. **Track failures** — Record the line number, regno, and error message for each failed row
4. **Generate a report** — Save a CSV of all failed rows to `/mnt/documents/er_master_import_errors.csv`
5. **Summary** — Print total inserted vs failed counts

## Technical Details
- Use Python with `subprocess` to call `psql` for each INSERT (pg env vars are already set)
- Extract the `regno` value from each INSERT for identification
- Use `ON CONFLICT (regno) DO UPDATE` approach or just run raw INSERT and catch errors
- Output failed rows report as a downloadable CSV

## Output
- Data inserted into `er_master` table
- `/mnt/documents/er_master_import_errors.csv` — list of all rows that failed with error details

