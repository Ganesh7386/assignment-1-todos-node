const { format } = require("date-fns");
const formattedDate = format(new Date("2021-1-21"), "yyyy-MM-dd");
console.log(formattedDate);
