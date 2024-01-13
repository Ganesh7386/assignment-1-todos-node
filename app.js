const express = require("express");
const app = express();

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const db_file = path.join(__dirname, "./todoApplication.db");
app.use(express.json());
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
  // console.log(req.query);
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

const getQueryBasedOnBodyForPutRequest = (req, res, next) => {
  const { priority, category, dueDate, todo, status } = req.body;
  const { todoId } = req.params;
  console.log({ priority, category, dueDate, todo, status });
  let resMsg = null;
  let querySql = null;
  let errMsg = null;
  let isAnyErr = false;
  const statusPredefinedArr = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityPredefinedArr = ["HIGH", "MEDIUM", "LOW"];
  const categoryPredefinedArr = ["HOME", "WORK", "LEARNING"];
  switch (true) {
    case priority !== undefined:
      if (!priorityPredefinedArr.includes(priority)) {
        isAnyErr = true;
        errMsg = "Invalid Todo Priority";
      } else {
        querySql = `UPDATE TODO SET priority='${priority}' WHERE id = ${todoId};`;
        resMsg = "Priority Updated";
      }
      break;
    case category !== undefined:
      if (!categoryPredefinedArr.includes(category)) {
        isAnyErr = true;
        errMsg = "Invalid Todo Category";
      } else {
        querySql = `UPDATE TODO SET category='${category}'  WHERE id = ${todoId}; `;
        resMsg = "Category Updated";
      }
      break;
    case todo !== undefined:
      querySql = `UPDATE TODO SET todo ='${todo}'  WHERE id = ${todoId}; `;
      resMsg = "Todo Updated";
      break;
    case status !== undefined:
      if (!statusPredefinedArr.includes(status)) {
        isAnyErr = true;
        errMsg = "Invalid Todo Status";
      } else {
        querySql = `UPDATE TODO SET status = '${status}'  WHERE id = ${todoId}; `;
        resMsg = "Status Updated";
      }
      break;
    case dueDate !== undefined:
      // console.log(`Date from body is ${due_date}`);
      const dueDate = new Date(dueDate);
      if (isValid(new Date(`${dueDate}`))) {
        querySql = `UPDATE TODO SET due_date='${dueDate}'  WHERE id = ${todoId};`;
        resMsg = "Due Date Updated";
      } else {
        //console.log(`due date error is ${e.message}`);
        isAnyErr = true;
        errMsg = "Invalid Due Date";
        console.log("error in due_date");
      }
      break;
  }
  console.log(`Query sql is ${querySql}`);

  if (isAnyErr) {
    console.log(`Error msg is ${errMsg}`);
    res.status(400).send(errMsg);
  } else {
    req.updateQuery = querySql;
    req.resMsg = resMsg;
    next();
  }
};

app.get("/todos/", filterBasedOnQueryParams, async (req, res) => {
  const { priority, status, search_q, category } = req;
  console.log({ priority, status, search_q, category });
  const gettingTodoBasedOnQueryParamsQuery = `SELECT * FROM TODO 
  WHERE priority LIKE '%${priority}%' AND status LIKE '%${status}%' AND todo LIKE '%${search_q}%' AND 
  category LIKE '%${category}%' ;`;
  console.log(gettingTodoBasedOnQueryParamsQuery);
  try {
    const allToDosList = await db.all(gettingTodoBasedOnQueryParamsQuery);
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
app.get("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const gettingTodoBasedOnIdQuery = `SELECT * FROM todo WHERE id = ${todoId}`;
  try {
    const todoList = await db.get(gettingTodoBasedOnIdQuery);
    res.send(todoList);
    console.log(todoList);
  } catch (e) {
    console.log(e.message);
  }
});

// creating a todo and posting
const verifyValuesInTodoPost = (req, res, next) => {
  const { priority, status, category, due_date } = req.body;
  console.log({ priority, status, category, due_date });
  let isAnyError = false,
    errMsg = "";
  const statusPredefinedArr = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityPredefinedArr = ["HIGH", "MEDIUM", "LOW"];
  const categoryPredefinedArr = ["HOME", "WORK", "LEARNING"];

  switch (true) {
    case !statusPredefinedArr.includes(status):
      isAnyError = true;
      errMsg = "Invalid Todo Status";
      console.log("error in status");
      break;
    case !priorityPredefinedArr.includes(priority):
      isAnyError = true;
      errMsg = "Invalid Todo Priority";
      console.log("error in priority");
      break;
    case !categoryPredefinedArr.includes(category):
      isAnyError = true;
      errMsg = "Invalid Todo Category";
      console.log("invalid category");
      break;
    case !isValid(new Date(`${due_date}`)):
      isAnyError = true;
      errMsg = "Invalid Due Date";
      console.log("error in due_date");
      break;
  }
  console.log(`Any error ${isAnyError}`);

  if (isAnyError) {
    console.log(`Error is ${errMsg}`);
    res.status(400).send(errMsg);
  } else {
    next();
  }
};

app.post("/todos", verifyValuesInTodoPost, async (req, res) => {
  const { id, todo, priority, status, category, due_date } = req.body;
  const addingTodoQuery = `INSERT INTO TODO(id , todo , priority , status , category , due_date) VALUES
     (${id} , '${todo}' , '${priority}' , '${status}' , '${category}' , '${due_date}'  )`;
  try {
    console.log("before run");
    const postingTodoResponse = await db.run(addingTodoQuery);
    res.send("Todo Successfully Added");
    console.log(postingTodoResponse);
  } catch (e) {
    console.log(e.message);
  }
});

// till now api's are completed ################# --->>> sign for continuation

app.put(
  "/todos/:todoId",
  getQueryBasedOnBodyForPutRequest,
  async (req, res) => {
    const { updateQuery, resMsg } = req;
    // updating using run methods
    await db.run(updateQuery);
    console.log("run is over");
    res.send(resMsg);
    console.log("response sent");
  }
);

// path for deleting todo

app.delete("/todos/:id/", async (req, res) => {
  const { id } = req.params;
  const deletingTodoQuery = `DELETE FROM TODO WHERE id = ${id} `;
  // deleting todo using run method

  try {
    await db.run(deletingTodoQuery);
    // console.log(deletingTodoPromise);
    res.send("Todo Deleted");
  } catch (e) {
    console.log(e.message);
  }
});

module.exports = app;
