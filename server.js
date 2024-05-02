const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const db = require("./database");
const multer = require("multer");
app.use(session({ secret: "g#a%t&v%i#t%" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "dikshant0447.be21@chitkara.edu.in",
    pass: "erytdyxhuliofqko",
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public"); // Set the destination folder for uploads
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
});

app.get("/", (req, res) => {
  let msg = "";
  if (req.session.msg != "") {
    msg = req.session.msg;
  }
  res.render("login", { msg: msg });
});
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  let sql = "";
  if (isNaN(email)) {
    sql = `select * from user where email = '${email}' and password = '${password}' and status = 1 and softdelete = 0`;
  } else {
    sql = `select * from user where mobile = ${email} and password = '${password}' and status = 1 and softdelete = 0`;
  }
  db.query(sql, (error, result, frields) => {
    if (error) throw err;
    if (result.length == 0) {
      res.render("login", { msg: "Invalid credentials!" });
    } else {
      req.session.uid = result[0].uid;
      req.session.un = result[0].username;
      req.session.dob = result[0].dob.toISOString().split("T")[0];
      req.session.bio = result[0].about;
      req.session.dor = result[0].dor.toISOString().split("T")[0];
      req.session.fullname =
        result[0].fname + " " + result[0].mname + " " + result[0].lname;
      req.session.profilepic = result[0].profilepic;
      req.session.banner = result[0].headerimage;
      req.session.profile = false;
      res.redirect("/home");
    }
  });
});
app.get("/signup", (req, res) => {
  res.render("signup", { msg: "" });
});
app.post("/signup_success", (req, res) => {
  const { username, fname, mname, lname, email, password, cpass, dob, gender } =
    req.body;
  let sql_check = "";
  let sql_username = "";
  if (password != cpass) {
    error_messg = "password and confirm password not same!";
    res.render("signup", { msg: error_messg });
  } else {
    if (isNaN(email)) {
      sql_check = `select email from user where email = '${email}'`;
      sql_username = `select uid from user where username='${username}'`;
    } else {
      sql_check = `select mobile from user where mobile = ${email}`;
      sql_username = `select uid from user where username='${username}'`;
    }
    db.query(sql_check, (err, result, fields) => {
      if (err) throw err;
      if (result.length == 1) {
        let error_messg = "";
        if (isNaN(email)) {
          error_messg = "Email id already in use!";
        } else {
          error_messg = "Mobile Number already in use!";
        }
        res.render("signup", { msg: error_messg });
      } // end of result.length function which checks whether email/mobile already in use or not
      else {
        // now we will register here by entering the user details
        db.query(sql_username, (err, re, fields) => {
          if (err) throw err;
          console.log(re);
          if (re.length == 1) {
            let error_messg = "username already registered!!";
            res.render("signup", { msg: error_messg });
          } else {
            let sql = "";
            if (isNaN(email)) {
              sql =
                "insert into user (username,fname,mname,lname,email,password,dob,dor,gender,status) values (?,?,?,?,?,?,?,?,?,?)";
            } else {
              sql =
                "insert into user (username,fname,mname,lname,mobile,password,dob,dor,gender,status) values (?,?,?,?,?,?,?,?,?,?)";
            }
            let d = new Date();
            let m = d.getMonth() + 1;
            let dor = d.getFullYear() + "-" + m + "-" + d.getDate();
            db.query(
              sql,
              [
                username,
                fname,
                mname,
                lname,
                email,
                password,
                dob,
                dor,
                gender,
                1
              ],
              (err, result, fields) => {
                if (err) throw err;
                if (result.insertId > 0) {
                  if (isNaN(email)) {
                    const mailOptions = {
                      from: "dikshant0447.be21@chitkara.edu.in",
                      to: email,
                      subject: "Verification Link",
                      html: "<a href='http://localhost:8080/verify_success/${uid}' style='padding: 15px 20px;background-color:lightblue;color:white;'>Verify</a>",
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                      if (error) {
                        console.log(error);
                      } else {
                        console.log("Email sent: " + info.response);
                      }
                    });
                  }

                  req.session.msg =
                    "Account created... Check email for verification link";
                  res.redirect("/");
                } else {
                  req.session.msg =
                    "Registration Unsuccessful! Please try again";
                }
              }
            );
          }
        });
      }
    });
  }
});
app.get("/verify_success", (req, res) => {
  console.log("account will be verif      ied!!");
  req.session.msg = "";
  res.redirect("/");
});
app.get("/logout", (req, res) => {
  req.session.uid = "";
  res.redirect("/");
});
const sortByDate = (a, b) => {
  return new Date(b.datetime) - new Date(a.datetime);
};
app.get("/home", (req, res) => {
  if (req.session.uid != "") {
    let msg = "";
    msg = req.session.msg;
    req.session.profile = false;
    const sql =
      "SELECT t.*, GROUP_CONCAT(iv.img_vdo_name) AS images " +
      "FROM ( " +
      "  SELECT tweet.*, user.username AS user_username " +
      "  FROM tweet AS tweet " +
      "  INNER JOIN followers AS f ON tweet.uid = f.follow_uid " +
      "  INNER JOIN user ON tweet.uid = user.uid " +
      "  WHERE f.uid = ? " +
      "  ORDER BY tweet.datetime DESC " +
      ") AS t " +
      "LEFT JOIN tweet_img_video AS iv ON t.tid = iv.tid " +
      "GROUP BY t.tid " +
      "ORDER BY t.datetime DESC";

    db.query(sql, [req.session.uid], (error, result, fields) => {
      if (error) throw error;
      // console.log(result);
      let search_str = req.session.un;
      let sql1 =
        "select tweet.*,user.username as user_username from tweet inner join user on user.uid=tweet.uid where tweet.content like '%@" +
        search_str +
        "%'";
      db.query(sql1, (err, rest) => {
        if (err) console.log(err);
        result = [...result, ...rest];
        result.sort(sortByDate);
        console.log(result);
        res.render("home", {
          mssg: "",
          result_tweets: result,
          result: "",
          search: false,
          username: req.session.un,
          profile: false,
        });
      });
    });
  } else {
    req.session.msg = "Please login first to view home page!";
    res.redirect("/");
  }
});

app.post("/tweet-submit", upload.array("images[]"), (req, res) => {
  const tweet = req.body.tweet;
  const images = req.files; // Contains an array of uploaded files

  let sql = "INSERT INTO tweet (uid, content, datetime) VALUES (?, ?, ?)";
  let sqlParams = [req.session.uid, tweet, getCurrentDateTime()];

  db.query(sql, sqlParams, (err, result) => {
    if (err) {
      console.log(err);
      return res.render("home", { mssg: "Unable to post tweet!" });
    }

    if (result.insertId <= 0) {
      return res.render("home", { mssg: "Unable to post tweet!" });
    }

    const tid = result.insertId; // Get the ID of the inserted tweet

    if (images && images.length > 0) {
      let imgSql = "INSERT INTO tweet_img_video (tid, img_vdo_name) VALUES ?";
      let imgValues = images.map((image) => [tid, image.originalname]);
      console.log(imgValues);
      db.query(imgSql, [imgValues], (imgErr, imgResult) => {
        if (imgErr) {
          console.log(imgErr);
          return res.render("home", {
            mssg: "Unable to post tweet!",
            profile: req.session.profile,
          });
        }
        res.redirect("/home");
      });
    } else {
      res.redirect("/home");
    }
  });
});

function getCurrentDateTime() {
  let date = new Date();
  let month = date.getMonth() + 1;
  return `${date.getFullYear()}-${month}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

app.get("/following", (req, res) => {
  let sql =
    "select * from user where uid in (select follow_uid from followers where uid = ?)"; // sql to print to whom am I following
  db.query(sql, [req.session.uid], (err, result) => {
    if (err) throw err;
    res.render("home", {
      text: "Follower List",
      nav: "following",
      profile: true,
      message: "Profile page",
      username: req.session.un,
      search: false,
      mssg: "",
      result: "",
      follower: result,
      bio: req.session.bio,
      dob: req.session.dob,
      dor: req.session.dor,
      fullname: req.session.fullname,
      profilepic: req.session.profilepic,
      banner: req.session.banner,
    });
  });
});
app.get("/search/profile", (req, res) => {
  const search_str = req.query["search"];
  let sql =
    "select * from user where username like '%" +
    search_str +
    "%'and uid not in(select follow_uid from followers where uid=?)";
  db.query(sql, [req.session.uid], (err, rest, fields) => {
    if (err) console.log(err);
    console.log(rest);
    let sql1 =
      "SELECT t.*, GROUP_CONCAT(iv.img_vdo_name) AS images " +
      "FROM (" +
      "   SELECT tweet.*, user.username AS user_username, user.uid AS user_uid " +
      "   FROM tweet " +
      "   INNER JOIN user ON tweet.uid = user.uid " +
      "   WHERE user.uid = ? " +
      "   ORDER BY tweet.datetime DESC" +
      ") AS t " +
      "LEFT JOIN tweet_img_video iv ON t.tid = iv.tid " +
      "GROUP BY t.tid ORDER BY tweet.datetime DESC";

    db.query(sql1, [req.session.uid], (error, result, fields) => {
      if (error) throw error;
      console.log(result);
      res.render("home", {
        mssg: "",
        result_tweets: result,
        result: rest,
        search: true,
        username: req.session.un,
        profile: req.session.profile,
        profilepic: req.session.profilepic,
        banner: req.session.banner,
        fullname: req.session.fullname,
        dor: req.session.dor,
        bio: req.session.bio,
        dob: req.session.dob,
        nav: "post",
      });
    });
  });
});
app.get("/profile", (req, res) => {
  req.session.profile = true;
  const sql = "select * from user where uid=?";
  db.query(sql, [req.session.uid], (err, result) => {
    if (err) console.log(err);
    req.session.bio = result[0].about;
    req.session.dob = result[0].dob.toISOString().split("T")[0];
    req.session.profilepic = result[0].profilepic;
    req.session.banner = result[0].headerimage;
    res.render("home", {
      profile: true,
      message: "Profile page",
      username: req.session.un,
      search: false,
      mssg: "",
      result: "",
      bio: result[0].about,
      dob: result[0].dob.toISOString().split("T")[0],
      dor: req.session.dor,
      fullname: req.session.fullname,
      profilepic: result[0].profilepic,
      banner: result[0].headerimage,
      nav: "post",
      text: "Posts",
      result_tweets: "",
    });
  });
});
app.post(
  "/edit-profile",
  upload.fields([
    { name: "profile-pic", maxCount: 1 },
    { name: "banner-pic", maxCount: 1 },
  ]),
  (req, res) => {
    const { bio, dob } = req.body;
    let sql = "update user set about=?,dob=?";
    const params = [bio, dob];
    if (req.files["profile-pic"] && req.files["profile-pic"].length > 0) {
      sql += ", profilepic = ?";
      params.push(req.files["profile-pic"][0].filename);
    }

    // Check if banner_pic is provided
    if (req.files["banner-pic"] && req.files["banner-pic"].length > 0) {
      sql += ", headerimage = ?";
      params.push(req.files["banner-pic"][0].filename);
    }
    sql += " WHERE uid = ?";
    params.push(req.session.uid);
    db.query(sql, params, (err, result) => {
      if (err) console.log(err);
      req.session.bio = bio;
      req.session.dob = dob;
      console.log("profile updated!");
    });
    res.redirect("/profile");
  }
);
app.get("/user-posts", (req, res) => {
  let sql =
    "SELECT t.*, GROUP_CONCAT(iv.img_vdo_name) AS images " +
    "FROM (" +
    "   SELECT tweet.*, user.username AS user_username, user.uid AS user_uid " +
    "   FROM tweet " +
    "   INNER JOIN user ON tweet.uid = user.uid " +
    "   WHERE user.uid = ? " +
    "   ORDER BY tweet.datetime DESC" +
    ") AS t " +
    "LEFT JOIN tweet_img_video iv ON t.tid = iv.tid " +
    "GROUP BY t.tid ORDER BY tweet.datetime DESC";

  db.query(sql, [req.session.uid], (error, result, fields) => {
    if (error) throw error;
    console.log(result);
    res.render("home", {
      text: "Post",
      nav: "post",
      profile: true,
      message: "Profile page",
      username: req.session.un,
      search: false,
      mssg: "",
      result: "",
      result_tweets: result,
      bio: req.session.bio,
      dob: req.session.dob,
      dor: req.session.dor,
      fullname: req.session.fullname,
      profilepic: req.session.profilepic,
      banner: req.session.banner,
    });
  });
});
app.get("/followers", (req, res) => {
  const sql =
    "select username from user where uid in(select uid from followers where follow_uid=?)";
  db.query(sql, [req.session.uid], (err, result) => {
    if (err) console.log(err);
    console.log(result);
    res.render("home", {
      text: "Follower List",
      nav: "followers",
      profile: true,
      message: "Profile page",
      username: req.session.un,
      search: false,
      mssg: "",
      result: "",
      follower: result,
      bio: req.session.bio,
      dob: req.session.dob,
      dor: req.session.dor,
      fullname: req.session.fullname,
      profilepic: req.session.profilepic,
      banner: req.session.banner,
    });
  });
});

app.get("/follow/:id", (req, res) => {
  const follow_uid = req.params.id;
  const sql = "insert into followers(uid,follow_uid)values(?,?)";
  db.query(sql, [req.session.uid, follow_uid], (err, result) => {
    if (err) console.log(err);
    res.redirect("/user-posts");
  });
});

app.get("/search/home/", (req, res) => {
  const search_str = req.query["search"];
  let sql =
    "select * from user where username like '%" +
    search_str +
    "%'and uid not in(select follow_uid from followers where uid=?)";
  db.query(sql, [req.session.uid], (err, rest, fields) => {
    if (err) console.log(err);
    console.log(rest);
    const sql1 =
      "SELECT t.*, GROUP_CONCAT(iv.img_vdo_name) AS images " +
      "FROM ( " +
      "  SELECT tweet.*, user.username AS user_username " +
      "  FROM tweet AS tweet " +
      "  INNER JOIN followers AS f ON tweet.uid = f.follow_uid " +
      "  INNER JOIN user ON tweet.uid = user.uid " +
      "  WHERE f.uid = ? " +
      "  ORDER BY tweet.datetime DESC " +
      ") AS t " +
      "LEFT JOIN tweet_img_video AS iv ON t.tid = iv.tid " +
      "GROUP BY t.tid " +
      "ORDER BY t.datetime DESC";

    db.query(sql1, [req.session.uid], (error, result, fields) => {
      if (error) throw error;
      console.log(result);
      res.render("home", {
        mssg: "",
        result_tweets: result,
        result: rest,
        search: true,
        username: req.session.un,
        profile: req.session.profile,
        profilepic: req.session.profilepic,
        banner: req.session.banner,
        fullname: req.session.fullname,
        dor: req.session.dor,
        bio: req.session.bio,
        dob: req.session.dob,
        nav: "post",
      });
    });
  });
});

app.get("/insert_like", (req, res) => {
  const tweetid = req.query["tweetid"];
  const sql = "select * from tweet_likes where tid=? and uid=?";
  db.query(sql, [tweetid, req.session.uid], (err, result) => {
    if (result.length == 1) {
      res.status(200).send("liked");
    } else {
      const datetime = new Date().toISOString().slice(0, 19).replace("T", " ");
      const sql1 = "insert into tweet_likes(tid,uid,datetime) values(?,?,?)";
      db.query(sql1, [tweetid, req.session.uid, datetime], (err, result) => {
        if (err) console.log(err);
        res.status(200).send("liked");
      });
    }
  });
});

app.get("/likes", (req, res) => {
  const sql =
    "select count(*) as likes from tweet_likes where tid in(select tid from tweet where uid=?);";
  db.query(sql, [req.session.uid], (err, result) => {
    if (err) console.log(err);
    console.log(result);
    res.render("home", {
      text: "Follower List",
      nav: "likes",
      profile: true,
      message: "Profile page",
      username: req.session.un,
      search: false,
      mssg: "",
      result: "",
      like: result[0].likes,
      bio: req.session.bio,
      dob: req.session.dob,
      dor: req.session.dor,
      fullname: req.session.fullname,
      profilepic: req.session.profilepic,
      banner: req.session.banner,
    });
  });
});

app.post("/comment-submit/:id", (req, res) => {
  const { comment } = req.body;
  const tid = req.params.id;

  const sql =
    "insert into tweet_comment(tid,uid,comment,datetime) values(?,?,?,?)";
  db.query(
    sql,
    [tid, req.session.uid, comment, getCurrentDateTime()],
    (err, result) => {
      if (err) console.log(err);
      res.redirect("/home");
    }
  );
});
app.get("/getcomment/:id", (req, res) => {
  const tid = req.params.id;
  const sql =
    "select tweet_comment.comment,user.username from tweet_comment inner join user on tweet_comment.uid=user.uid where tweet_comment.tid=?";
  db.query(sql, [tid], (err, result) => {
    if (err) console.log(err);
    res.json(result);
  });
});

app.get("/getlikes/:id", (req, res) => {
  const tid = req.params.id;
  const sql = "select count(*) as like_count from tweet_likes where tid=?";
  db.query(sql, [tid], (err, result) => {
    if (err) console.log(err);
    res.json(result);
  });
});
app.get("/getcomments/:id", (req, res) => {
  const tid = req.params.id;
  const sql = "select count(*) as comment_count from tweet_comment where tid=?";
  db.query(sql, [tid], (err, result) => {
    if (err) console.log(err);
    res.json(result);
  });
});

app.listen(8080, () => console.log("Server running at http://localhost:8080"));
