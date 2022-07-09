// ====== IMPORTS ======
// Chicken class
var Chicken = require('./chicken.js');
// Use body parser to encode and decode json request
var bodyParser = require('body-parser');
// Use express
var express = require('express');
// Use pg to handle SQL requests
const { Client } = require('pg');
// Use pg-prepared to handle sql injections
var prep = require('pg-prepared')

var app = express();
var port = 8000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ====== DATABASE CONFIGURATION ======
const client = new Client({
  user: '',
  host: '',
  database: 'chicken', // name of the database
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
    "idCoop" INTEGER, \
    PRIMARY KEY ("id"));', (err, res) => { });

client.query('create table if not exists coop( \
    "id" SERIAL, \
    "name" VARCHAR(255) NOT NULL, \
    PRIMARY KEY ("id"));', (err, res) => { });

// ====== WEBSERVICES ======

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
        return new Chicken.Chicken(obj)
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
        return new Chicken.Chicken(obj)
      })
      response.json(returned_list);
    }
  });
});

// POST route to add a new chicken
app.post("/chicken", function(request, response) {
  console.log("POST chicken request");

  // Can't POST a new chicken without a name or a weight
  if (request.body.name === undefined ||
    request.body.weight === undefined) {
    response.status(500).send({ error: "The name and the weight of the chicken must be specified" });
    return;
  }

  let replace_struct = new Chicken.Chicken(request.body, false);

  if (replace_struct.steps === undefined) {
    replace_struct.steps = 0;
  }
  if (replace_struct.isRunning === undefined) {
    replace_struct.isRunning = false;
  }
  if (request.body.idCoop === undefined) {
    replace_struct.idCoop = null;
  } else {
    replace_struct.idCoop = request.body.idCoop;
  }


  // prepare the SQL request to avoid SQL injections
  let prepared = prep('INSERT INTO chicken (name, birthday, weight, steps, "isRunning", "idCoop")\n values (${name}, ${birthday}, ${weight}, ${steps}, ${isRunning}, ${idCoop});')

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
  console.log("PUT chicken request");
  let name = request.params.name;

  // Can't PUT a chicken without a weight
  if (request.body.weight === undefined) {
    response.status(500).send({ error: "The name and the weight of the chicken must be specified" });
    return;
  }

  let replace_struct = new Chicken.Chicken(request.body, false);

  if (replace_struct.new_name === undefined) {
    replace_struct.new_name = name;
  }
  if (replace_struct.steps === undefined) {
    replace_struct.steps = 0;
  }
  if (replace_struct.isRunning === undefined) {
    replace_struct.isRunning = false;
  }
  if (request.body.idCoop === undefined) {
    replace_struct.idCoop = null;
  } else {
    replace_struct.idCoop = request.body.idCoop;
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
  console.log("PATCH chicken request");
  let name = request.params.name;
  // Use to have a variadic update SQL request
  let str_modify = "";
  // handle comma in the str_modify
  let first = true;

  let replace_struct = {
    chicken_name: name,
  };

  // struct to handle various number of modification
  let dict_attr = {
    name: "name=${name}",
    birthday: "birthday=${birthday}",
    weight: "weight=${weight}",
    steps: "steps=${steps}",
    isRunning: '"isRunning"=${isRunning}',
    idCoop: '"idCoop"=${idCoop}',
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
    if (err) {
      response.status(400).send("Error while updating datas");
    }
    else {
      response.json(res.rows);
    }
  });
});

// DELETE delete chickens selected by the name
app.delete("/chicken/:name", function(request, response) {
  console.log("DELETE chicken request");
  let name = request.params.name;

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

// ====== BONUS ======

// GET route to add a new coop
app.get("/coop", async function(request, response) {
  console.log("GET coop request");

  let selected_coop;
  let selected_chicken;

  // Perform the SQL request to select all coop
  client.query('SELECT * from coop', (err, res) => {
    if (err)
      response.status(400).send("Error while getting datas");
    else {
      selected_coop = res.rows;
      // Perform the SQL request to select all chickens
      client.query('SELECT * from chicken', (err, res) => {
        if (err)
          response.status(400).send("Error while getting datas");
        else {
          selected_chicken = res.rows;

          // Create a list of chickens in every coop
          for (elt of selected_coop) {
            elt.chickens = selected_chicken.filter(x => x.idCoop === elt.id).map(obj => new Chicken.Chicken(obj));
          }
          response.json(selected_coop);
        }
      });
    }
  });
});

// POST route to add a new coop
app.post("/coop", function(request, response) {
  console.log("POST coop request");

  // Can't POST a new chicken without a name or a weight
  if (request.body.name === undefined) {
    response.status(500).send({ error: "The name of the coop must be specified" });
    return;
  }

  // prepare the SQL request to avoid SQL injections
  let prepared = prep('INSERT INTO coop (name)\n values (${name});')

  // Perform the prepared SQL request
  client.query(prepared({ name: request.body.name }), (err, res) => {
    if (err) {
      response.status(400).send("Error while posting datas");
    }
    else {
      response.json(res.rows);
    }
  });
});
