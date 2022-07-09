# CHICKEN-RUN

## AUTHOR

- Alan GUERET

## Dependencies

I used a `PostgreSQL` database.

I used these libraries:
  - body-parser
  - express
  - pg
  - pg-prepared

## Usage

Run: `node chicken.js`

The server is now launched on `http://localhost:8000/`

## API

Available APIs:
  Normal:
    - `GET /chicken` : get all chickens object
    - `POST /chicken` : Add a new chicken
    - `PUT /chicken/{name}` : Change all informations of all chickens with this name
    - `PATCH /chicken/{name}` : Change some informations of all chickens with this name
    - `DELETE /chicken/{name}` : Delete all the chickens which have this name
    - `GET /chicken/run` : Increment the steps attribute of all chickens which are running
  Bonus:
    - `GET /coop` : get all coops with every chickens in it
    - `POST /coop` : Add a new coop

You can specify a chicken's coop by adding a `idCoop` attribute during the `POST`, `PUT`, `PATCH` methods for the chickens
