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

// Create the database if it does not exist
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
  let prepared = prep('UPDATE chicken SET steps=steps+1 WHERE "isRunning"=true;')
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
  let prepared = prep('SELECT * from chicken WHERE name=(${name});')
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

  let prepared = prep('INSERT INTO chicken (name, birthday, weight, steps, "isRunning")\n values (${name}, ${birthday}, ${weight}, ${steps}, ${isRunning});')
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

  let prepared = prep('UPDATE chicken SET name=${new_name}, birthday=${birthday}, weight=${weight}, steps=${steps}, "isRunning"=${isRunning} WHERE name=${name};')
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
  let first = true;
  let str_modify = "";

  console.log("PATCH chicken request");
  let replace_struct = {
    name: name,
  };

  if (request.body.name !== undefined) {
    replace_struct.new_name = request.body.name;
    if (!first) {
      str_modify += ", ";
    } else {
      first = false;
    }
    str_modify += "name=${new_name}";
  }
  if (request.body.birthday !== undefined) {
    replace_struct.birthday = Date.parse(request.body.weight) / 1000;
    if (!first) {
      str_modify += ", ";
    } else {
      first = false;
    }
    str_modify += "birthday=${birthday}";
  }
  if (request.body.weight !== undefined) {
    replace_struct.weight = request.body.weight;
    if (!first) {
      str_modify += ", ";
    } else {
      first = false;
    }
    str_modify += "weight=${weight}";
  }
  if (request.body.steps !== undefined) {
    replace_struct.steps = request.body.steps;
    if (!first) {
      str_modify += ", ";
    } else {
      first = false;
    }
    str_modify += "steps=${steps}";
  }
  if (request.body.isRunning !== undefined) {
    replace_struct.isRunning = request.body.isRunning;
    if (!first) {
      str_modify += ", ";
    } else {
      first = false;
    }
    str_modify += "'isRunning'=${isRunning}";
  }

  let prepared = prep('UPDATE chicken SET ' + str_modify + ' WHERE name=${name};')
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
  let prepared = prep('DELETE FROM chicken \n WHERE name=(${name});')
  client.query(prepared({ name: name }), (err, res) => {
    if (err)
      response.status(400).send("Error while deleting datas");
    else {
      response.json(res.rows);
    }
  });
});
