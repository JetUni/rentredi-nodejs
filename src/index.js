/*
Task name: User endpoints

Requirements
  1.  We need to create CRUD endpoints
  2.  The entries (users) can just be saved in a noSQL database (Bonus for using Firebase Realtime Database)
  3.  Each user should have the following data entries: 
        id, name, zip code, latitude, longitude, timezone
  4.  When creating a user, allow input for name and zip code.  
      (Fetch the latitude, longitude, and timezone - Documentation: https://openweathermap.org/current) 
  5.  When updating a user, Re-fetch the latitude, longitude, and timezone (if zip code changes)
  6.  Connect to a ReactJS front-end
  * feel free to add something creative if you'd like
*/

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
  update
} from "firebase/database";
import fetch from "node-fetch";

var OW_API_Key = "7afa46f2e91768e7eeeb9001ce40de19";

const app = express();
app.use(
  bodyParser.json(),
  bodyParser.urlencoded({ extended: false }),
  cors({
    origin: ["https://75qfqt.csb.app"]
  })
);

const firebaseConfig = {
  databaseURL: "https://rentredi-9e7a3-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const fbapp = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const db = getDatabase(fbapp);

async function updateUserData(userId, name, zip) {
  const updateData = {};
  if (name) {
    updateData["name"] = name;
  }

  if (zip) {
    // Get latitude, longitude, and timezone
    const openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?zip=${zip},us&appid=${OW_API_Key}`;
    const res = await fetch(openWeatherUrl);
    const weatherData = await res.json();
    const tzHours = weatherData.timezone / 3600;
    const tzStr = tzHours < 0 ? `UTC${tzHours}` : `UTC+${tzHours}`;
    updateData["zip"] = zip;
    updateData["timezone"] = tzStr;
    updateData["longitude"] = weatherData.coord.lon;
    updateData["latitude"] = weatherData.coord.lat;
  }

  update(ref(db, "users/" + userId), updateData);
}

async function pushUserData(name, zip) {
  // Get latitude, longitude, and timezone
  const openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?zip=${zip},us&appid=${OW_API_Key}`;
  const res = await fetch(openWeatherUrl);
  const weatherData = await res.json();
  if (+weatherData.cod !== 200) {
    return Promise.reject(weatherData);
  }
  const tzHours = weatherData.timezone / 3600;
  const tzStr = tzHours < 0 ? `UTC${tzHours}` : `UTC+${tzHours}`;

  const data = {
    name,
    zip,
    longitude: weatherData.coord.lon,
    latitude: weatherData.coord.lat,
    timezone: tzStr
  };

  const newUserId = push(ref(db, "users")).key;
  set(ref(db, "users/" + newUserId), data);
}

app.get("/", async (req, res) => {
  let companyName = "RentRedi";
  res.send(`Welcome to the ${companyName} interview!`);
});

app.get("/users", async (req, res) => {
  const usersRef = ref(db, "users");
  onValue(
    usersRef,
    (data) => {
      res.send({ users: data.val() });
    },
    { onlyOnce: true }
  );
});

app.get("/users/:userId", async (req, res) => {
  const userRef = ref(db, "users/" + req.params.userId);
  onValue(
    userRef,
    (data) => {
      res.send({ user: data.val() });
    },
    { onlyOnce: true }
  );
});

app.post("/users/new", async (req, res) => {
  console.log("Create User");
  try {
    await pushUserData(req.body.name, req.body.zip);
    res.sendStatus(201);
  } catch (e) {
    res.status(e.cod).send(e.message);
  }
});

app.put("/users/:userId", async (req, res) => {
  console.log("Update User");
  await updateUserData(req.params.userId, req.body.name, req.body.zip);
  res.sendStatus(201);
});

app.delete("/users/:userId", async (req, res) => {
  console.log("Delete User");
  const userRef = ref(db, "users/" + req.params.userId);
  await remove(userRef);
  res.sendStatus(200);
});

app.listen(8080);
