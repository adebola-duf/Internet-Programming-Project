const express = require("express");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const path = require("path");
require('dotenv').config();

const vapidPublicKey = "BLaG7DTWYirv2zjzKc9OtHj5GESprfxo6CcplUGCfYQ6rIA_iZ1JGIztrGvQFIla97A2wcFA3yt_Aaw8AQs6T_o";
const vapidPrivateKey = process.env.VAPIDPRIVATEKEY;
const app = express();
const port = 8000;

//set static path
app.use(express.static(path.join(__dirname, "static")))
app.use(bodyParser.json());

const {Pool} = require('pg');
const dbURL = process.env.DB_URL;

app.post("/create-user", (req, res) => {
  const body = req.body;
  
  const newUserData = {
    firstName: body.firstName,
    lastName: body.lastName,
    username: body.username,
    email: body.email,
    password: body.password,
  };

  const pool = new Pool({
    connectionString: dbURL  
  });

  // Construct thea SQL query
  const insertQuery = {
    text: "INSERT INTO medication_reminder_app_users (first_name, last_name, username, password, email) VALUES ($1, $2, $3, $4, $5)",
    values: [newUserData.firstName, newUserData.lastName, newUserData.username, newUserData.password, newUserData.email],
  };

  pool.query(insertQuery, (err, res) => {
    if (err) {
      console.error('Error executing query', err);
      return;
    }
  
  });
  pool.end();
  res.status(200).json({ message: 'Registration successful!' });
})

app.post("/get-user", (req, response) => {
  const body = req.body;
  const pool = new Pool({
    connectionString: dbURL  
  });

  const selectQuery = {
      text: "SELECT * FROM medication_reminder_app_users WHERE username = $1",
      values: [body.username],
    };
  
  pool.query(selectQuery, (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      return;
    }
    const results = result.rows;
    
    if (results.length > 0){
      if (body.password != results[0].password){
        response.status(401).json({message: "Incorrect username or password."});
      }
      else{
        response.status(200).json({message: "Successful Login.", user: results[0]});
      }
    }
    else {
      response.status(401).json({message: "Incorrect username or password."});
    }
    pool.end(); 
  });
})

webpush.setVapidDetails('mailto:adeboladuf@gmail.com', vapidPublicKey, vapidPrivateKey);

app.post("/subscribe", (req, res) =>{
    //Get subscription object
    const body = req.body;
    subscription = body.subscription;
    reminderReason = body.reminderReason;
    res.status(201).json({});

    //Create a payload
    const payload = JSON.stringify({title: reminderReason, message: "Hello there! 🌟 It's time for your medication. Your health is a priority, and you're doing an amazing job taking care of yourself. Take a moment for your well-being. Remember, each step is a stride towards a healthier you. 💊✨"})

    //pass object into sendNotification
    webpush.sendNotification(subscription, payload).catch(error => console.log(error));
})


app.post('/add-reminders', (req, res) => {
  const body = req.body;
  const insertQuery = {
      text: "INSERT INTO medication_reminder_app_reminders (reminder_id, description, user_id, reminder_time) VALUES ($1, $2, $3, $4)",
      values: [body.reminderId, body.medicationDescription, body.userId, body.reminderTime],
    };
  const pool = new Pool({
    connectionString: dbURL  
  });
  
  pool.query(insertQuery, (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      return;
    }

  });
  pool.end();
})
 

app.delete("/del-reminders/:reminderId", (req, res) => {
  const { reminderId } = req.params;
  try {
    const deleteQuery = {
      text: 'DELETE FROM medication_reminder_app_reminders WHERE reminder_id = $1',
      values: [reminderId],
    };
    const pool = new Pool({
      connectionString: dbURL  
    });
    pool.query(deleteQuery, (err, result) => {
      res.status(200).json({ message: `reminder with ID ${reminderId} deleted successfully.` });
    });

  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
})


app.get("/get-reminders/:userId", (req, res) => {
  const { userId } = req.params;
  const pool = new Pool({
    connectionString: dbURL  
  });
  try {
    pool.query('SELECT * FROM medication_reminder_app_reminders WHERE user_id = $1', [userId], (err, result) => {
      if (err) {
        console.error('Error executing query', err);
        return;
      }
      else{
        const results = result.rows;
        const reminders = results;
        res.status(200).json(reminders);
      }
    });

  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})


app.listen(port, () => console.log(`server started on port 8 ${port}`))