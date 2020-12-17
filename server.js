const express = require("express");
const mysql = require("mysql");
const path = require("path");
const hbs = require('hbs');

const app = express();


//set the data base connection string
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    port: 3306,
    database: "my-database",
});

//connect to the database
db.connect((error) => {
    if (error) {
        console.log(error);
    } else {
        console.log("MySQL Connected");
    }
});

//get the folder directory
const viewsPath = path.join(__dirname, '/views');
const publicDirectory = path.join(__dirname, '/public');
// set the path for the inc files (partials)
const partialPath = path.join(__dirname, '/views/inc');
hbs.registerPartials(partialPath);
//needed to pass data from form
app.use(express.urlencoded({ extended: false }));
//set express to use the static files
app.use(express.static(publicDirectory));
//set the view engine to hbs
app.set('view engine', 'hbs');
//setting the views from hbs to come from our views path variable
app.set('views', viewsPath);

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/allUsers", (req, res) => {
    // query the database - return the results and feed them into the users variable in index.hbs
    db.query("SELECT * FROM users", (error, results) => {
        res.render("allUsers", {
            users: results
        });
    })
});

app.post("/allPosts/:id", (req, res) => {
    const id = req.params.id;
    const user = [id];
    // query the database - return the results and feed them into the users variable in index.hbs
    db.query("SELECT * FROM blog_posts where user_id = ? order by dt desc", user, (error, results) => {
        if (results.length > 0) {
            res.render("allPosts", {
                posts: results
            });
        } else {
            res.render("allPosts", {
                result: "This user doesn't have any posts!"
            });
        }
    })
});

app.get("/newPost/:id", (req, res) => {
    const id = req.params.id;
    res.render("newPost", { id: id })
});

app.post("/newPost/:id", (req, res) => {
    const id = req.params.id;
    const title = req.body.title;
    const content = req.body.content;
    // query the database - return the results and feed them into the users variable in index.hbs
    db.query(
        "INSERT INTO blog_posts SET ?",
        {
            //name in db : name of variable
            title: title,
            content: content,
            user_id: id,
        },
        (error, results) => {
            if (error) {
                res.render("newPost", {
                    result: error
                });
            } else {
                res.render("newPost", {
                    result: "New post created succesfully!"
                });
            }
        }
    );
});

app.get("/blogPosts", (req, res) => {
    // query the database - return the results and feed them into the users variable in index.hbs
    db.query("SELECT a.*, b.* FROM blog_posts a inner join users b on a.user_id = b.id order by a.dt desc", (error, results) => {
        res.render("blogPosts", {
            posts: results
        });
    })
});

app.post("/post/:id", (req, res) => {
    const id = req.params.id;
    const post = [id];
    db.query("SELECT a.*, b.name FROM blog_posts a inner join users b on a.user_id = b.id WHERE post_id = ? ", post, (error, results) => {
        const day = results[0].dt.toLocaleDateString().split('/')[1];
        const month = results[0].dt.toLocaleDateString().split('/')[0];
        const year = results[0].dt.toLocaleDateString().split('/')[2];

        res.render("post", {
            title: results[0].title,
            content: results[0].content,
            name: results[0].name,
            date: `${day}/${month}/${year}`
        });
    })
});

app.post("/blogPosts", (req, res) => {
    const name = req.body.name;
    const user = [name];
    // query the database - return the results and feed them into the users variable in index.hbs
    db.query("SELECT a.*, b.name FROM blog_posts a inner join users b on a.user_id = b.id WHERE b.name like ? order by a.dt desc", `%${user}%`, (error, results) => {
        res.render("blogPosts", {
            posts: results
        });
    })
});

app.post("/updateUser/:id", (req, res) => {
    const id = req.params.id;
    const user = [id];
    db.query("SELECT * FROM users where id = ?", user, (error, results) => {
        res.render("updateUser", {
            id: results[0].id,
            name: results[0].name,
            job: results[0].job,
            location: results[0].location,
            age: results[0].age,
            email: results[0].email,
            password: results[0].pword,
        });
    })
});

app.post("/profile/:id", (req, res) => {
    const id = req.params.id;
    const user = [id];
    db.query("SELECT * FROM users where id = ?", user, (error, results) => {
        res.render("profile", {
            id: results[0].id,
            name: results[0].name,
            job: results[0].job,
            location: results[0].location,
            age: results[0].age,
            email: results[0].email,
        });
    })
});

app.post("/update/:id", (req, res) => {
    const id = req.params.id;
    const job = req.body.userJob;
    const location = req.body.userLocation;
    const age = req.body.userAge;
    const email = req.body.userEmail;
    const name = req.body.userName;
    const password = req.body.userPassword;

    const query = "UPDATE users SET name = ?, age = ?, location = ?, job = ?, email = ?, pword = ? WHERE id = ?";
    const user = [name, age, location, job, email, password, id];
    db.query(query, user, (error, results) => {
        if (error) {
            res.render("update", {
                result: error
            });
        } else {
            res.render("update", {
                result: "User succesfully updated!"
            });
        }
    });
});

app.post("/deleteUser/:id", (req, res) => {
    const id = req.params.id;
    const user = [id];
    db.query("SELECT * FROM users where id = ?", user, (error, results) => {
        res.render("deleteUser", {
            id: results[0].id,
            name: results[0].name
        });
    });
});

app.post("/delete/:id", (req, res) => {
    const id = req.params.id;
    const user = [id];
    db.query("DELETE FROM blog_posts where user_id = ?", user, (error, results) => {
        if (error) {
            res.render("delete", {
                result: error
            });
        } else {
            db.query("DELETE FROM users where id = ?", user, (error, results) => {
                if (error) {
                    res.render("delete", {
                        result: error
                    });
                } else {
                    res.render("delete", {
                        result: "User succesfully removed!"
                    });
                }
            });
        }
    });
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    let email = req.body.userEmail;
    const emailAdd = [email];
    let alreadyRegistered = false;
    db.query("SELECT * FROM users where email = ?", emailAdd, (error, results) => {
        if (results.length > 0) {
            res.render("register", {
                result: `User already exists with email address: ${email}`
            });
        } else {
            let name = req.body.userName;
            let age = req.body.userAge;
            let job = req.body.userJob;
            let location = req.body.userLocation;
            let password = req.body.userPassword;

            db.query(
                "INSERT INTO users SET ?",
                {
                    //name in db : name of variable
                    name: name,
                    age: age,
                    location: location,
                    job: job,
                    email: email,
                    pword: password,
                },
                (error, results) => {
                    if (error) {
                        res.render("register", {
                            result: error
                        });
                    } else {
                        res.render("register", {
                            result: "User added succesfully!"
                        });
                    }
                }
            );
        }
    });
});

app.get('*', function (req, res) {
    res.status(404).render("pagenotfound");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});