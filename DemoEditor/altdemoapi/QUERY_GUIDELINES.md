# Query Guidelines

## Writing new queries
Queries can be created from Query objects. New Query objects should be initialized as fields of the Queries class

<br>
```
{KEY} = Query( {SQL Query} )
```
<br>
The KEY is the identifier for the sql query. It should be descriptive.
For example, for an SQL query: 

`SELECT * FROM table WHERE name='jeff';`

a suitable KEY would be: `get_all_jeffs_from_table`
<br>
*For standardized formatting, please write all KEYs lowercase and snake-cased.*
<br>
If a query requires parameters, include them in squiggly brackets
<br> Ex: <br>

```python

class Queries(Loader):
    def __init__(self):
        get_all_jeffs_from_table = Query('SELECT * FROM {table_name} table WHERE table.name = 'jeff';')
```

Queries can be accessed with QUERIES.query_name
<br> Ex: <br>

`QUERIES.get_all_jeffs_from_table`

