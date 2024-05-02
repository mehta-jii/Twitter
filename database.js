const mysql = require("mysql2");
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mytouch@4G",
  database: "twitter",
});
con.connect((err) => {
  if (err) throw err;
  console.log("connected");
});
module.exports = con;
