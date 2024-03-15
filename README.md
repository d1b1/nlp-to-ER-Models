#### NLP to Entity Models for Cypher
This is a simple POC that uses OpenAI to parse human statements into 
data structures needed for building Neo4j or Tigergraph cypher statements.

[Need Image(s)]

#### Usage
Download, install and use the CLI to run the model.

```
npx nlp 'John worked for IBM and direct reported to Larry White before Larry moved to Google in 2021.'
```

```
{
    [ 'John', 'worked for', 'IBM' ],
    [ 'Larry White', 'worked at', 'IBM' ],
    [ 'John', 'reported to ', 'Larry White' ],
    [ 'Larry White', 'worked at', 'Google', 'year=2021']
}
```

```
Cypher code
```

#### Resources & References
- https://www.geeksforgeeks.org/relationship-extraction-in-nlp/