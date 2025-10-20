# Query Guidelines

## Writing new queries
### Step 1: YAML file
Everyone has a separate yaml file for creating new queries. <br>
Queries follow the form:
<br>
```
{TAG}: {SQL Query}
```
<br>
The TAG is the identifier for the sql query. It should be descriptive.
For example, for an SQL query: 

`SELECT * FROM table WHERE name='jeff';`

a suitable TAG would be: `get_all_jeffs_from_table`
<br>
*For standardized formatting, please write all TAGs lowercase and snake-cased.*
<br>
All sql queries should be in single quotes to prevent any reserved character issues
<br>
If a query requires parameters, include them in squiggly brackets
<br> Ex: <br>

```
get_all_jeffs_from_table: 'SELECT * FROM {table_name} table WHERE table.name = 'jeff';'
```

### Step 2: Python Tagger
In load.py, add the TAGs for your sql queries to the Query class. <br>
When referencing queries in your code:
<br>
To get query `get_all_jeffs_from_table`:
<br>
`load.QUERY.get_all_jeffs_from_table`
<br>

