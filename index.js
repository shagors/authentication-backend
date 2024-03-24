const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow all origins dynamically
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("client-task");
    const collection = db.collection("clients");

    // Route to register a new user
    app.post("/register", async (req, res) => {
      try {
        const { name, email, password } = req.body;
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Get the database and collection
        const db = client.db("client-task");
        const collection = db.collection("clients");
        // Create a new user document
        const user = { name, email, password: hashedPassword, level: 1 };
        // Insert the user document into the collection
        await collection.insertOne(user);
        res.status(201).send("User registered successfully");
      } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      }
    });

    // Route for user login
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        // Get the database and collection
        const db = client.db("client-task");
        const collection = db.collection("clients");
        // Find the user by email
        const user = await collection.findOne({ email });
        if (!user) {
          return res.status(404).send("User not found");
        }
        // Compare the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).send("Invalid password");
        }
        // Generate JWT token
        const token = jwt.sign(
          { email: user.email, level: user.level },
          "secretkey",
          { expiresIn: "1h" }
        );
        res.status(200).json({ token });
      } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      }
    });

    // Middleware for verifying JWT token
    const verifyToken = (req, res, next) => {
      const token = req.headers["authorization"];
      if (!token) {
        return res.status(401).send("Access denied. No token provided.");
      }
      try {
        const decoded = jwt.verify(token, "secretkey");
        req.user = decoded;
        next();
      } catch (err) {
        console.error(err);
        res.status(403).send("Invalid token");
      }
    };

    // Route for accessing restricted content
    app.get("/dashboard", verifyToken, (req, res) => {
      // Check user level to determine access
      if (req.user.level >= 1) {
        res.send("Welcome to the dashboard!");
      } else {
        res.status(403).send("Access denied.");
      }
    });

    // update and delete

    // // UPDATE one by id
    // app.put("/api/v1/user/:id", async (req, res) => {
    //   try {
    //     const supplyId = req.params.id;
    //     // console.log(supplyId);
    //     const updatedData = req.body;
    //     // console.log(updatedData);
    //     // Convert the string ID to ObjectId
    //     const objectId = new ObjectId(supplyId);
    //     // Update the supply by ID
    //     const result = await collection.updateOne(
    //       { _id: objectId },
    //       { $set: updatedData }
    //     );
    //     if (result.matchedCount === 0) {
    //       return res.status(404).json({
    //         success: false,
    //         message: "Supply not found",
    //       });
    //     }
    //     res.status(200).json({
    //       success: true,
    //       message: "Supply updated successfully",
    //     });
    //   } catch (error) {
    //     console.error("Error in PUT /api/v1/supplies/:id", error);
    //     res.status(500).json({
    //       success: false,
    //       message: "Internal Server Error",
    //     });
    //   }
    // });

    // // DELETE one by id
    // app.delete("/api/v1/user/:id", async (req, res) => {
    //   try {
    //     const supplyId = req.params.id;

    //     // Convert the string ID to ObjectId
    //     const objectId = new ObjectId(supplyId);

    //     // Delete the supply by ID
    //     const result = await collection.deleteOne({ _id: objectId });

    //     if (result.deletedCount === 0) {
    //       return res.status(404).json({
    //         success: false,
    //         message: "Supply not found",
    //       });
    //     }

    //     res.status(200).json({
    //       success: true,
    //       message: "Supply deleted successfully",
    //     });
    //   } catch (error) {
    //     console.error("Error in DELETE /api/v1/supplies/:id", error);
    //     res.status(500).json({
    //       success: false,
    //       message: "Internal Server Error",
    //     });
    //   }
    // });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
