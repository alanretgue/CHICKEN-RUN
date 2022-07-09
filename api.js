// ====== IMPORTS ======
//Use body parser to encode and decode json request
var bodyParser = require('body-parser');
//Use express
var express = require('express');
//Use pg to handle SQL requests
const { Client } = require('pg');
//Use pg-prepared to handle sql injections
var prep = require('pg-prepared')

var app = express();
var port = 8000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ====== DATABASE CONFIGURATION ======
const client = new Client({
  user: '',
  host: '',
  database: 'tutorial_1', // name of the database
  password: '',
  port: 5432,
});

// Connect to the database
client.connect();

// Listen on the specified port
app.listen(port, function() {
  var message = "server running on port: " + port;
  console.log(message);
});

// Create the chicken database if it does not exist
client.query('create table if not exists chicken( \
    "id" SERIAL, \
    "name" VARCHAR(255) NOT NULL, \
    "birthday" INTEGER, \
    "weight" INTEGER NOT NULL, \
    "steps" INTEGER DEFAULT 0, \
    "isRunning" BOOLEAN DEFAULT false, \
    PRIMARY KEY ("id"));', (err, res) => { });

// Route '/' which print something on the browser
app.get("/", function(request, response) {
  response.send("Welcome to the chicken run !!! ");
});

// GET route for the CRUD
app.get("/chicken", function(request, response) {
  console.log("GET chicken request");

  // Perform the SQL request
  client.query('SELECT * from chicken', (err, res) => {
    if (err)
      response.status(400).send("Error while getting datas");
    else {
      let returned_list = res.rows.map(obj => {
        return {
          name: obj.name,
          birthday: new Date(obj.birthday * 1000),
          weight: obj.weight,
          steps: obj.steps,
          isRunning: obj.isRunning,
        }
      })
      response.json(returned_list);
    }
  });
});

// GET Increment steps for all chickens which are running
app.get("/chicken/run", function(request, response) {
  console.log("Run chickens");

  // prepare the SQL request to avoid SQL injections
  let prepared = prep('UPDATE chicken SET steps=steps+1 WHERE "isRunning"=true;')

  // Perform the prepared SQL request
  client.query(prepared(), (err, res) => {
    if (err)
      response.status(400).send("Error while deleting datas");
    else {
      response.json(res.rows);
    }
  });
});

// GET route for a specified chicken named
app.get("/chicken/:name", function(request, response) {
  let name = request.params.name;
  console.log("GET chicken named " + name + " request");

  // prepare the SQL request to avoid SQL injections
  let prepared = prep('SELECT * from chicken WHERE name=(${name});')

  // Perform the prepared SQL request
  client.query(prepared({ name: name }), (err, res) => {
    if (err)
      response.status(400).send("Error while getting datas");
    else {
      let returned_list = res.rows.map(obj => {
        return {
          name: obj.name,
          birthday: new Date(obj.birthday * 1000),
          weight: obj.weight,
          steps: obj.steps,
          isRunning: obj.isRunning,
        }
      })
      response.json(returned_list);
    }
  });
});

// POST route to add a new chicken
app.post("/chicken", function(request, response) {
  console.log("POST chicken request");

  if (request.body.name === undefined ||
    request.body.weight === undefined) {
    response.status(500).send({ error: "The name and the weight of the chicken must be specified" });
    return;
  }

  let replace_struct = {
    name: request.body.name,
    birthday: Date.parse(request.body.birthday) / 1000,
    weight: request.body.weight,
    steps: request.body.steps,
    isRunning: request.body.isRunning,
  };

  if (replace_struct.steps === undefined) {
    replace_struct.steps = 0;
  }
  if (replace_struct.isRunning === undefined) {
    replace_struct.isRunning = false;
  }

  // prepare the SQL request to avoid SQL injections
  let prepared = prep('INSERT INTO chicken (name, birthday, weight, steps, "isRunning")\n values (${name}, ${birthday}, ${weight}, ${steps}, ${isRunning});')

  // Perform the prepared SQL request
  client.query(prepared(replace_struct), (err, res) => {
    if (err) {
      response.status(400).send("Error while posting datas");
      console.log(err)
    }
    else {
      response.json(res.rows);
    }
  });
});

// PUT route to modify the chicken selected by the name
app.put("/chicken/:name", function(request, response) {
  let name = request.params.name;

  if (request.body.weight === undefined) {
    response.status(500).send({ error: "The name and the weight of the chicken must be specified" });
    return;
  }

  console.log("PUT chicken request");
  let replace_struct = {
    name: name,
    new_name: request.body.name,
    birthday: Date.parse(request.body.birthday) / 1000,
    weight: request.body.weight,
    steps: request.body.steps,
    isRunning: request.body.isRunning,
  };

  if (replace_struct.new_name === undefined) {
    replace_struct.new_name = name;
  }
  if (replace_struct.steps === undefined) {
    replace_struct.steps = 0;
  }
  if (replace_struct.isRunning === undefined) {
    replace_struct.isRunning = false;
  }

  // prepare the SQL request to avoid SQL injections
  let prepared = prep('UPDATE chicken SET name=${new_name}, birthday=${birthday}, weight=${weight}, steps=${steps}, "isRunning"=${isRunning} WHERE name=${name};')

  // Perform the prepared SQL request
  client.query(prepared(replace_struct), (err, res) => {
    if (err)
      response.status(400).send("Error while deleting datas");
    else {
      response.json(res.rows);
    }
  });
});

// PATCH route to modify the specified attribute in the request's body for the chicken selected by the name
app.patch("/chicken/:name", function(request, response) {
  let name = request.params.name;
  // Use to have a variadic update SQL request
  let str_modify = "";
  // handle comma in the str_modify
  let first = true;

  console.log("PATCH chicken request");
  let replace_struct = {
    chicken_name: name,
  };

  // struct to handle various number of modification
  let dict_attr = {
    name: "name=${name}",
    birthday: "birthday=${birthday}",
    weight: "weight=${weight}",
    steps: "steps=${steps}",
    isRunning: "'isRunning'=${isRunning}",
  };

  // Add specified modification to the SQL request
  for (key in request.body) {
    if (dict_attr[key] === undefined) {
      continue;
    }
    if (request.body[key] !== undefined) {
      replace_struct[key] = request.body[key];
      if (!first) {
        str_modify += ", ";
      } else {
        first = false;
      }
      str_modify += dict_attr[key];
    }
  }

  // prepare the SQL request to avoid SQL injections
  let prepared = prep('UPDATE chicken SET ' + str_modify + ' WHERE name=${chicken_name};')

  // Perform the prepared SQL request
  client.query(prepared(replace_struct), (err, res) => {
    if (err)
      response.status(400).send("Error while deleting datas");
    else {
      response.json(res.rows);
    }
  });
});

// DELETE delete chickens selected by the name
app.delete("/chicken/:name", function(request, response) {
  let name = request.params.name;
  console.log("DELETE chicken request");

  // prepare the SQL request to avoid SQL injections
  let prepared = prep('DELETE FROM chicken \n WHERE name=(${name});')

  // Perform the prepared SQL request
  client.query(prepared({ name: name }), (err, res) => {
    if (err)
      response.status(400).send("Error while deleting datas");
    else {
      response.json(res.rows);
    }
  });
});
