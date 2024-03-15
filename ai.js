const express = require("express");
const { checkJwt } = require("../authz/check-jwt");
const driver = require('../../clients/client.js')
const openai = require('../../clients/openai.js');

const openAiRouter = express.Router();

var aiCall = async (prompt) => {

    try {

        console.log('Starting AI:', prompt);

        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `Perform Named Entity Recognition (NER) and Names Entity Linking (NEL) on the following statement to identify People, Companies, and working relationships for use in NEO4j Graph Database. \n\nUse the identified NER and NEL entities to build a set graph db cipher MERGE statements to create nodes, and to create relationships between the nodes to record the working relationships. Only create entities for Person, Company, and only allow the following relationships linking the nodes: WORKED_FOR (Person worked for a company) ADVISED (A Person was an advisor for a company), and INVESTED_IN (A Person invested money in a company) or (A Company invested money in another Company). Return each of the MERGE nodes and relationships as a cypher RETURN statement to end the statement. \n\nRemember to NOT include properties in WORKED_FOR, INVESTED_IN or ADVISED. Return a JSON object with the cypher statement in a key 'cypher' and a summary of the entities found in a 'summary'  key. \n\nTranslate: \"${prompt}\"`,
            temperature: 0,
            max_tokens: 832,
            top_p: 1,
            best_of: 1,
            frequency_penalty: 0,
            presence_penalty: 0.6,
            stop: [ "Translate:", "Result:" ],
        });

        return response.data;

    } catch(err) {
        throw err;  
    }

}

var aiCall2 = async (prompt) => {

    const messages = [
      { role: "system", 
        content: `
           You are an expert at understanding the relationships 
           between people and companies. 
           
           Use the following labels:
           1. A person, use the label 'Person'.
           2. A company use the label 'Company'.

           You only looks for neo4j relationships:
           1. When a person worked for a company use the relationship 'WORKED_FOR'.
           2. When a person invested money in a company use the relationship 'INVESTED_IN'.
           3. When a person advised a company or person use the relationship 'ADVISED'
           4. When a person is a member of a company use the relationship 'MEMBER_OF'
           5. When a person founded a company use the relationship 'FOUNDED'
           6. When a person or company that might invest company use the relationship 'TARGET_OF'

           You use the neo4j command MERGE for all labels and relationships.
           Separate each cypher MERGE command with a comma at the end of the command.
           Do not use the cypher SET command. 
           
           Create a unique variable for each label and relationships for 
           each cypher MERGE command.

           Use the cypher command 'apoc.create.uuid()' to add a uuid property
           for all new labels. 

           You only store the following information in properties. And ignore 
           all other properties:

           1. 'amount' - The amount a person or company invests in a company using the 'INVESTED_IN' relationship as a number.
           2. 'year' - The year a person worked for a company, using 'WORKED' relationship as a four digit integer.
           3. 'gender' - The gender or sex of a person, using the Person label, as 'male', 'female' or 'other'.
           4. 'email' - The email address for a person using the Person label, as a string, but only if the value is found.
           5. 'name' - The name of the person or company, stored in the Person or Company label.
           5. 'role' - The role or job title of the person, stored in the Person or Company relationship.

           Do not create a property if the value is not found in the prompt.

           You return a json object with the cypher command in a key 'cypher' 
           and a summary of number of people and relationships of in a key 'summary'. 
        `
      },
      {
        role: "user",
        content: prompt,
      },
      //   { role: "assistant", content: "The 'openai' Node.js library." },
      //   { role: "user", content: question },
    ];

    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
    });

    return response.data;
}

openAiRouter.post("/query", checkJwt, async (req, res) => {

    // Validate the code to make sure we have values we can use.

    let prompt = req.body.prompt || req.query.prompt || '';
    if (!prompt) return res.send('No lucky for you both, need a prompt.');

    try {
        // Call and get the prompt.
        const ai = await aiCall(prompt);

        // Pull out the result.
        let resultJSONStr = ai.choices[0].text;
        let resultJSON = {};
        let goodJSON = false;

        try {
            resultJSON = JSON.parse(resultJSONStr);
            goodJSON = true;
        } catch (err) {
            console.log(err);
        }

        // Setup the return object.
        const result = {
            prompt: prompt,
            summary: ai.summary,
            json: resultJSON,
            goodJSON: goodJSON,
            raw: ai
        }
    
        res.json(result);

    } catch(err) {
        res.status(500).send(err.message);
    }

    
})

openAiRouter.post('/queryInfo', checkJwt, require('./getInfo.js'));

openAiRouter.post('/query2', checkJwt, require('./v3.js'));

openAiRouter.post("/store", checkJwt, async (req, res) => {

    let body = req.body || {};
    const cypher = body.cypher || '';
    console.log(body);
    const result = {};

    if (!cypher) return res.send('Invalid or missing cypher');

    try {
        const session = driver.session({ database: 'neo4j' });
        const writeResult = await session.executeWrite(tx =>
            tx.run(cypher, {})
        );

        console.log(writeResult);

        result.status = 'good';
        result.msg = writeResult;

    } catch(err) {
        result.status = 'bad';
        result.msg = `Failed query ` + err.message
    }

    res.json(result);

})

module.exports = {
    openAiRouter,
};
  