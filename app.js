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
  try {
    const { date } = req.query;
    console.log(`send date is ${date}`);
    const reqDate = new Date(date);
    // const gotDate = reqDate.getDate();
    // const gotMonth = reqDate.getMonth();
    // console.log(`Month is ${gotMonth}`);
    // const gotYear = reqDate.getFullYear();

    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    console.log(formattedDate);
    req.date = formattedDate;
    next();
  } catch (e) {
    console.log(e.message);
    res.status(400).send("Invalid Due Date");
  }
};

const filterBasedOnQueryParams = (req, res, next) => {
  const { status, priority, search_q, category } = req.query;
  console.log("at middleware");
  console.log(req.query);
  let isErrorOccured = false;

  if (status !== undefined) {
    const statusPredefinedArr = ["TO DO", "IN PROGRESS", "DONE"];
    const gotStatus = returnWithRemoved20(status);
    console.log(gotStatus);
    if (statusPredefinedArr.includes(gotStatus)) {
      req.status = gotStatus;
    } else {
      // req.status = "";
      isErrorOccured = true;
      res.status(400).send("Invalid Todo Status");
    }
  } else {
    req.status = "";
    console.log("status is empty");
  }

  if (priority !== undefined) {
    const priorityPredefinedArr = ["HIGH", "MEDIUM", "LOW"];
    if (priorityPredefinedArr.includes(priority)) {
      req.priority = priority;
    } else {
      req.priority = "";
      isErrorOccured = true;
      res.status(400).send("Invalid Todo Priority");
    }
  } else {
    req.priority = "";
    console.log("priority is empty");
  }

  if (search_q !== undefined) {
    req.search_q = search_q;
  } else {
    req.search_q = "";
    console.log("search_q is empty");
  }

  if (category !== undefined) {
    const categoryPredefinedArr = ["HOME", "WORK", "LEARNING"];
    if (categoryPredefinedArr.includes(category)) {
      req.category = category;
    } else {
      req.category = "";
      isErrorOccured = true;
      res.status(400).send("Invalid Todo Category");
    }
  } else {
    req.category = "";
    console.log("category is empty");
  }
  if (!isErrorOccured) {
    next();
  }
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
  try {
    const allToDosList = await db.get(gettingTodoBasedOnQueryParamsQuery);
    console.log(allToDosList);
    res.send(allToDosList);
  } catch (e) {
    console.log(e.message);
  }
});

// path to get agenda based on given date

app.get("/agenda/", formatDateAndSendToReqObj, async (req, res) => {
  const { date } = req;
  const gettingDataBasedOnDateQuery = `SELECT id , todo  , priority , status , category , due_date as dueDate FROM TODO WHERE due_date = '${date}' `;
  console.log(gettingDataBasedOnDateQuery);
  try {
    const todoBasedOnDate = await db.all(gettingDataBasedOnDateQuery);
    res.send(todoBasedOnDate);
  } catch (e) {
    console.log(e.message);
  }
});

// path for getting todo based on todo id
app.get("/todos/:id/", async (req, res) => {
  const { id } = req.params;
  const gettingTodoBasedOnIdQuery = `SELECT * FROM todo WHERE id = ${id}`;
  try {
    const todoList = await db.get(gettingTodoBasedOnIdQuery);
    res.send(todoList);
  } catch (e) {
    console.log(e.message);
  }
});

// creating a todo and posting

app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status, category, due_date } = req.body;
  const addingTodoQuery = `INSERT INTO TODO(id , todo , priority , status , category , due_date) VALUES
     (${id} , '${todo}' , '${priority}' , '${status}' , '${category}' , '${due_date}'  )`;
  try {
    const responseAfterAdding = await db.run(addingTodoQuery);
    console.log(responseAfterAdding);
    res.send("Todo Successfully Added");
  } catch (e) {
    console.log(e.message);
  }
});

// till now API's are completed ################# --->>> sign for continuation

app.put("/todos/:id", getQueryBasedOnBodyForPut, async (req, res) => {
  const updateQuery = req.updateQuery;
  // updating using run methods
  try {
    const updatingTodoPromise = await db.run(updateQuery);
    res.send("Todo updated successfully");
  } catch (e) {
    console.log(e.message);
  }
});

// path for deleting todo

app.delete("/todos/:id/", async (req, res) => {
  const { id } = req.params;
  const deletingTodoQuery = `DELETE FROM TODO WHERE id = ${id} `;
  // deleting todo using run method

  try {
    const deletingTodoPromise = await db.run(deletingTodoQuery);
    console.log(deletingTodoPromise);
    res.send("Todo Successfully deleted");
  } catch (e) {
    console.log(e.message);
  }
});

module.exports = app;
