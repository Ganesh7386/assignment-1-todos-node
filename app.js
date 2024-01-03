const express = require("express");
const app = express();
app.use(express.json());

const { format } = require("date-fns");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const db_file = path.join(__dirname, "./todoApplication.db");
let db = null;

const connecting_to_db_init_server = async () => {
  db = await open({
    filename: db_file,
    driver: sqlite3.Database,
  });

  app.listen(3000, () => {
    console.log(`connected to port ${3000}`);
  });
};

connecting_to_db_init_server();

// path with query parameters
const returnWithRemoved20 = (word) => {
  const splittedWord = word.split("%20");
  const joinedWord = splittedWord.join(" ");
  return joinedWord;
};

const formatDateAndSendToReqObj = (req, res, next) => {
  const { date } = req.query;
  console.log(`send date is ${date}`);
  const formattedDate = format(new Date(date), "yyyy-MM-dd");
  console.log(formattedDate);
  req.date = formattedDate;
  next();
};

const filterBasedOnQueryParams = (req, res, next) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = req.query;
  // console.log(req.query);

  const statusPredefinedArr = ["TO DO", "IN PROGRESS", "DONE"];
  const gotStatus = returnWithRemoved20(status);
  console.log(gotStatus);
  if (statusPredefinedArr.includes(gotStatus)) {
    req.status = gotStatus;
  } else {
    req.status = status;
  }

  const priorityPredefinedArr = ["HIGH", "MEDIUM", "LOW"];
  if (priorityPredefinedArr.includes(priority)) {
    req.priority = priority;
  } else {
    req.priority = priority;
  }

  req.search_q = search_q;

  const categoryPredefinedArr = ["HOME", "WORK", "LEARNING"];
  if (categoryPredefinedArr.includes(category)) {
    req.category = category;
  } else {
    req.category = category;
  }

  next();
};

const getQueryBasedOnBodyForPut = (req, res, next) => {
  const { priority, category, dueDate, todo, status } = req.body;
  let querySql = null;
  switch (true) {
    case priority !== undefined:
      querySql = `UPDATE TODO SET priority='${priority}'`;
      break;
    case category !== undefined:
      querySql = `UPDATE TODO SET category='${category}' `;
      break;
    case dueDate !== undefined:
      querySql = `UPDATE TODO SET date ='${date}' `;
      break;
    case todo !== undefined:
      querySql = `UPDATE TODO SET todo ='${todo}' `;
      break;
    case status !== undefined:
      querySql = `UPDATE TODO SET status = '${status}' `;
  }
  console.log(`Query sql is ${querySql}`);
  req.updateQuery = querySql;
  next();
};

app.get("/todos/", filterBasedOnQueryParams, async (req, res) => {
  const { priority, status, search_q, category } = req;
  console.log({ priority, status, search_q, category });
  const gettingTodoBasedOnQueryParamsQuery = `SELECT * FROM TODO 
  WHERE priority LIKE '%${priority}%' AND status LIKE '%${status}%' AND todo LIKE '%${search_q}%' AND 
  category LIKE '%${category}%' ;`;
  console.log(gettingTodoBasedOnQueryParamsQuery);
  const allToDosList = await db.all(gettingTodoBasedOnQueryParamsQuery);
  console.log(allToDosList);
  res.send(allToDosList);
});

// path to get agenda based on given date

app.get("/agenda/", formatDateAndSendToReqObj, async (req, res) => {
  const { date } = req;
  const gettingDataBasedOnDateQuery = `SELECT id , todo  , priority , status , category , due_date as dueDate FROM TODO WHERE due_date = '${date}' `;
  console.log(gettingDataBasedOnDateQuery);
  const todoBasedOnDate = await db.get(gettingDataBasedOnDateQuery);
  res.send(todoBasedOnDate);
});

// path for getting todo based on todo id
app.get("/todos/:id/", async (req, res) => {
  const { id } = req.params;
  const gettingTodoBasedOnIdQuery = `SELECT * FROM todo WHERE id = ${id}`;
  const todoList = await db.all(gettingTodoBasedOnIdQuery);
  res.send(todoList);
});

// creating a todo and posting

app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const addingTodoQuery = `INSERT INTO TODO(id , todo , priority , status , category , due_date) VALUES
     (${id} , '${todo}' , '${priority}' , '${status}' , '${category}' , '${dueDate}')`;

  const responseAfterAdding = await db.run(addingTodoQuery);
  console.log(responseAfterAdding);
  res.send("Todo Successfully Added");
});

// till now API's are completed ################# --->>> sign for continuation

app.put("/todos/:id", getQueryBasedOnBodyForPut, (req, res) => {
  const updateQuery = req.updateQuery;
  // updating using run methods
});

// path for deleting todo

app.delete("/todos/:id/", (req, res) => {
  const { id } = req.params;
  const deletingTodoQuery = `DELETE FROM TODO WHERE id = ${id} `;
  // deleting todo using run method
});
