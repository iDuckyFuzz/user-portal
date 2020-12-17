const express = require("express");
const mysql = require("mysql");
const path = require("path");
const hbs = require('hbs');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

dotenv.config({ path: './.env' });

const app = express();


//set the data base connection string
const db = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    port: process.env.PORT,
    database: process.env.DATABASE,
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
app.use(express.json());
app.use(cookieParser());
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
    try {
        const token = req.cookies.topsecret;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        db.query("SELECT * FROM users where id = ? and role = 'admin'", [decoded.id], (error, results) => {
            if (results.length === 1) {
                // query the database - return the results and feed them into the users variable in index.hbs
                db.query("SELECT * FROM users", (error, results) => {
                    res.render("allUsers", {
                        users: results
                    });
                })
            } else  {
                db.query("SELECT * FROM users where id = ?", [decoded.id], (error, results) => {
                    res.render("allUsers", {
                        users: results
                    });
                })
            }
        });
    } catch (error) {
        res.render("notAuthorised");
    }
});

app.post("/allPosts/:id", (req, res) => {
    const id = req.params.id;
    const user = [id];
    // query the database - return the results and feed them into the users variable in index.hbs
    // ? prevents sql injection

    db.query("SELECT a.*, b.name FROM blog_posts a inner join users b on a.user_id = b.id where user_id = ? order by dt desc", user, (error, results) => {
        results.forEach((result, i) => {
            results[i].dt = timestampToDate(results[i].dt)
        });
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

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { userName, userPassword } = req.body;
    try {
        if (!userName || !userPassword) {
            return res.status(400).render('login', {
                message: "Please enter a valid email address and password!"
            });
        }
    } catch (error) {
        console.log(error);
    }

    db.query('SELECT * FROM users where email = ?', [userName], async (error, results) => {
        // if no results or password doesn't match
        if (!results || !(await bcrypt.compare(userPassword, results[0].pword))) {
            //401 is forbidden access
            res.status(401).render('login', {
                message: "Invalid username or password!"
            });
        } else {
            const id = results[0].id;
            // in JS if key and variable are names the same you don't need to use :
            const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN
            });
            console.log("The token is: " + token);
            const cookieOptions = {
                expires: new Date(
                    Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                ),
                httpOnly: true
            }
            res.cookie('topsecret', token, cookieOptions);
            res.status(200).render('index');
        }
    })
});

app.get("/newPost/:id", (req, res) => {
    const id = req.params.id;
    res.render("newPost", { id: id })
});

app.post("/newPost/:id", (req, res) => {
    const id = req.params.id;
    const { title, content } = req.body
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
    try {
        const token = req.cookies.topsecret;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        db.query("SELECT * FROM users where id = ? and role = 'admin'", [decoded.id], (error, results) => {
            if (results.length === 0) {
                res.render("notAuthorised");
            } else {
                // query the database - return the results and feed them into the users variable in index.hbs
                db.query("SELECT a.*, b.* FROM blog_posts a inner join users b on a.user_id = b.id order by a.dt desc", (error, results) => {
                    results.forEach((result, i) => {
                        results[i].dt = timestampToDate(results[i].dt)
                    });
                    res.render("blogPosts", {
                        posts: results
                    });
                })
            }
        });
    } catch (error) {
        res.render("notAuthorised");
    }
});

app.post("/post/:id", (req, res) => {
    const id = req.params.id;
    const post = [id];
    db.query("SELECT a.*, b.name FROM blog_posts a inner join users b on a.user_id = b.id WHERE post_id = ? ", post, (error, results) => {
        res.render("post", {
            title: results[0].title,
            content: results[0].content,
            name: results[0].name,
            date: timestampToDate(results[0].dt)
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

app.post("/update/:id", async (req, res) => {
    const id = req.params.id;

    //destructure the req.body object to get out variables as apposed to creating each individually
    const { userJob, userLocation, userAge, userEmail, userName, userPassword } = req.body
    // password you want to hash and how many rounds of encryption
    let hashedPassword = await bcrypt.hash(userPassword, 8);
    const query = "UPDATE users SET name = ?, age = ?, location = ?, job = ?, email = ?, pword = ? WHERE id = ?";
    const user = [userName, userAge, userLocation, userJob, userEmail, hashedPassword, id];
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
    try {
        const token = req.cookies.topsecret;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        db.query("SELECT * FROM users where id = ? and role = 'admin'", [decoded.id], (error, results) => {
            if (results.length === 0) {
                res.render("notAuthorised");
            } else {
                res.render("register");
            }
        });
    } catch (error) {
        res.render("notAuthorised");
    }
});

app.post("/register", (req, res) => {

    let email = req.body.userEmail;
    const emailAdd = [email];
    db.query("SELECT * FROM users where email = ?", emailAdd, async (error, results) => {
        if (error) {
            res.render("register", {
                result: error
            });
        } else {
            if (results.length > 0) {
                res.render("register", {
                    result: `User already exists with email address: ${email}`
                });
            } else {
                //object destructuring
                const { userName, userAge, userJob, userLocation, userPassword } = req.body;
                let hashedPassword = await bcrypt.hash(userPassword, 8);
                db.query(
                    "INSERT INTO users SET ?",
                    {
                        //name in db : name of variable
                        name: userName,
                        age: userAge,
                        location: userLocation,
                        job: userJob,
                        email: email,
                        pword: hashedPassword,
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
        }
    });
});

const timestampToDate = (date) => {

    const day = date.toLocaleDateString().split('/')[1];
    const month = date.toLocaleDateString().split('/')[0];
    const year = date.toLocaleDateString().split('/')[2];

    return `${day}/${month}/${year}`;
}

app.get('*', function (req, res) {
    res.status(404).render("pagenotfound");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});