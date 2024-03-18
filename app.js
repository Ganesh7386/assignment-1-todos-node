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

const modifyKeysOfResponseList = (listOfObj) => {
  const modifiedKeysOfResponse = listOfObj.map((eachObj) => ({
    id: eachObj.id,
    todo: eachObj.todo,
    priority: eachObj.priority,
    status: eachObj.status,
    category: eachObj.category,
    dueDate: eachObj.due_date,
  }));
  return modifiedKeysOfResponse;
};

const modifyKeysOfResponseOfSingleObj = (eachObj) => {
  return {
    id: eachObj.id,
    todo: eachObj.todo,
    priority: eachObj.priority,
    status: eachObj.status,
    category: eachObj.category,
    dueDate: eachObj.due_date,
  };
};

// (((((((((((  <<<<<<<<-----------   for getting todos based on different query parameters
const filteringBasedOnQueryParams = (req, res, next) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = req.query;
  console.log({ status, priority, search_q, category });

  let errMsg = "";
  let anyErr = false;

  let queryFlags = [
    {
      status1: false,
      stmt: "",
    },
    {
      priority1: false,
      stmt: "",
    },
    {
      category1: false,
      stmt: "",
    },
  ];
  //console.log(queryFlags);
  //console.log({ status, priority, category, search_q });
  if (status !== "") {
    const statusPredefinedArr = ["TO DO", "IN PROGRESS", "DONE"];
    const gotStatus = returnWithRemoved20(status);
    queryFlags[0] = { status1: true, stmt: `AND status = "${status}" ` };
    if (!statusPredefinedArr.includes(status)) {
      errMsg = "Invalid Todo Status";
      anyErr = true;
      //queryFlags.status = false;
      console.log("status error");
    }
  }

  if (category !== "") {
    const categoryPredefinedArr = ["HOME", "WORK", "LEARNING"];
    queryFlags[2] = { category1: true, stmt: `AND category = "${category}" ` };
    if (!categoryPredefinedArr.includes(category)) {
      errMsg = "Invalid Todo Category";
      anyErr = true;
      console.log("category error");
    }
  }

  if (priority !== "") {
    const priorityPredefinedArr = ["HIGH", "MEDIUM", "LOW"];
    queryFlags[1] = { priority1: true, stmt: `AND priority = "${priority}" ` };
    if (!priorityPredefinedArr.includes(priority)) {
      errMsg = "Invalid Todo Priority";
      anyErr = true;
      console.log("priority error");
    }
  }
  //let sqlQuery = `SELECT * FROM TODO WHERE todo LIKE "%${search_q}%" and status LIKE "%${status}%" and priority LIKE "%${priority}%" and  category LIKE "%${category}%";`;
  let sqlQuery = `SELECT * FROM TODO WHERE todo LIKE "%${search_q}%" `;
  let queryList = [];
  // forming sql query from queryFlags
  console.log(queryFlags);

  switch (true) {
    case queryFlags[0].status1:
      queryList.push(`${queryFlags[0].stmt}`);
    case queryFlags[1].priority1:
      queryList.push(`${queryFlags[1].stmt}`);
    case queryFlags[2].category1:
      queryList.push(`${queryFlags[2].stmt}`);
  }

  console.log(queryList);
  const joinedQueries = queryList.join(" ");
  console.log(`Joined query is ${joinedQueries}`);
  // console.log(queryList);
  sqlQuery = `${sqlQuery} ${joinedQueries}`;
  console.log(`Final sql query is ${sqlQuery}`);
  if (anyErr) {
    res.status(400).send(errMsg);
    console.log("error occured");
  } else {
    // console.log(queryFlags);
    req.sqlQuery = sqlQuery;
    console.log("Went to next handler");
    next();
    //const selectionQuery = designQueryBasedOnBoolean(queryFlags);
  }
};

app.get("/todos/", filteringBasedOnQueryParams, async (req, res) => {
  const { sqlQuery } = req;
  console.log(sqlQuery);
  try {
    const allToDosList = await db.all(sqlQuery);
    const modifiedResponseOfList = modifyKeysOfResponseList(allToDosList);
    console.log(modifiedResponseOfList);
    console.log("reached to end");
    res.send(modifiedResponseOfList);
  } catch (e) {
    console.log(e.message);
  }
});
//  ---------->>>> Completed API-1   <<<<<<<<<<<<----------------------     <<<<<<<<<<<>>>>>>>>>>>>>  ))))))))))))))

// (((((((((((    API-2 <<<<<<<<--------- Starting  ------------------->>>>>>>

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

app.get("/agenda/", formatDateAndSendToReqObj, async (req, res) => {
  const { date } = req;
  const gettingDataBasedOnDateQuery = `SELECT id , todo  , priority , status , category , due_date as dueDate FROM TODO WHERE due_date = '${date}' `;
  console.log(gettingDataBasedOnDateQuery);
  try {
    const todoListBasedOnDate = await db.all(gettingDataBasedOnDateQuery);
    console.log("&&&&&&&");
    console.log(todoListBasedOnDate);
    const modifiedkeysOfListOfObjFromRes = todoListBasedOnDate.map(
      (eachObj) => ({
        id: eachObj.id,
        todo: eachObj.todo,
        priority: eachObj.priority,
        status: eachObj.status,
        category: eachObj.category,
        dueDate: eachObj.dueDate,
      })
    );
    // console.log(modifiedkeysOfListOfObjFromRes);
    res.send(modifiedkeysOfListOfObjFromRes);
  } catch (e) {
    console.log(e.message);
  }
});

// ---------------->>>>>> Completed API-2 <<<<<<<<---------------------->>>>>>>>---------------<<<<<>>>>>>  )))))))))))))

// ((((((((((((((     <<<<<<<<<------------------- API-3 for getting todo based on id  ---------->>>>>>>

// path for getting todo based on todo id
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const gettingTodoBasedOnIdQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  try {
    const todoItem = await db.get(gettingTodoBasedOnIdQuery);
    const modifiedKeysResObj = modifyKeysOfResponseOfSingleObj(todoItem);
    console.log(modifiedKeysResObj);
    res.send(modifiedKeysResObj);
  } catch (e) {
    console.log(e.message);
  }
});

// ---------->>>>>>>  COmpleted API-3   <<<<<<<<<<<-------------------- >>>>>>>>>>>>><<<<<<<<<<<<<<<< )))))))))

//((((((((((    <<<<<<<<<<<<<<<<<<<<--------- API-4 for Posting a TODO  ------------>>>>>>>>>>>>>>

// creating a todo and posting
const verifyValuesInTodoPost = (req, res, next) => {
  const { priority, status, category, due_date } = req.body;
  console.log({ priority, status, category, due_date });
  let isAnyError = false;
  let errMsg = "";
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

app.post("/todos/", verifyValuesInTodoPost, async (req, res) => {
  const { todo, priority, status, category, due_date } = req.body;
  const addingTodoQuery = `INSERT INTO TODO(todo , priority , status , category , due_date) VALUES
     ('${todo}' , '${priority}' , '${status}' , '${category}' , '${due_date}'  ) ;`;
  try {
    console.log("before run");
    const postingTodoResponse = await db.run(addingTodoQuery);
    res.send("Todo Successfully Added");
    console.log(postingTodoResponse);
  } catch (e) {
    console.log(e.message);
  }
});

//   ------------>>>>> API-4 Completed <<<<<<<------------------------<<<<<<<<<<<<>>>>>>>>>>>>>  )))))))))))))))

//(((((((((((( <<<<<<<<<<<----------- API-5 for changing a TODO parameter  --------------------->>>>>>>>>>>>>>>>>>

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
      //const dueDate = new Date(dueDate);
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

app.put(
  "/todos/:todoId/",
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

// ---------->>>>>> API-5   Completed --------------->>>>>>>>>>>>>>    --------<<<<<<<<<<<<<<<<<<<>>>>>>> )))))))))))

// ((((((((((((   <<<<<<<<<<<<<<<-------------- API-6 for Deleting a Todo based on id ----------------->>>>>>>>>>>.

app.delete("/todos/:id/", async (req, res) => {
  const { id } = req.params;
  const deletingTodoQuery = `DELETE FROM TODO WHERE id = ${id} ;`;
  // deleting todo using run method

  try {
    const deletingTodoPromise = await db.run(deletingTodoQuery);
    console.log(deletingTodoPromise);
    res.send("Todo Deleted");
  } catch (e) {
    console.log(e.message);
  }
});

// --------------->>>>>>>>>>> API-6 Completed    ------------------>>>>>>>>>>>>>><<<<<<<<<<<<<>>>>>>>>>> ))))))))))))

module.exports = app;
