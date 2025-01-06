/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg, { Client } from 'pg';
import express from 'express';
import { ClientError, errorMiddleware } from './lib/index.js';

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

type Entries = {
  title: string;
  notes: string;
  photoUrl: string;
};

const app = express();
app.use(express.json());

//  Create an endpoint to get all the list of entries. ( GET /entries )
app.get('/api/entries', async (req, res, next) => {
  try {
    const sql = `
    select *
    from entries;
    `;

    const result = await db.query(sql);
    const entries = result.rows;

    res.status(200).json(entries);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (
      Number.isNaN(entryId) ||
      !Number.isInteger(+entryId) ||
      Number(entryId) < 1
    ) {
      throw new ClientError(400, `Invalid entryId.`);
    }

    const sql = `
      select *
      from entries
      where "entryId" = $1;
    `;

    const params = [Number(entryId)];
    const result = await db.query(sql, params);
    const [entry] = result.rows;
    if (!entry) {
      throw new ClientError(404, `entryId ${entryId} does not exist.`);
    }

    res.status(200).json(entry);
  } catch (err) {
    next(err);
  }
});

//  Create an endpoint to create a new entry. ( POST /entries )
app.post('/api/entries', async (req, res, next) => {
  try {
    const { title, notes, photoUrl }: Entries = req.body;

    if (!title || !notes || !photoUrl) {
      throw new ClientError(400, 'title, notes and photoUrl is required.');
    }

    const sql = `
      insert into entries ("title", "notes", "photoUrl")
      values ($1, $2, $3)
      returning *;
    `;

    const body = [title, notes, photoUrl];
    const [entry] = (await db.query(sql, body)).rows;
    if (!entry) {
      throw new ClientError(404, 'Invalid entry');
    }

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

//  Create an endpoint to update a particular entry. ( PUT /entries/:entryId )
app.put('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const { title, notes, photoUrl }: Entries = req.body;

    if (
      Number.isNaN(entryId) ||
      !Number.isInteger(+entryId) ||
      Number(entryId) < 1
    ) {
      throw new ClientError(400, `Invalid entryId.`);
    }

    if (!title || !notes || !photoUrl) {
      throw new ClientError(400, 'title, notes and photoUrl is required.');
    }

    const sql = `
      update entries
      set
        "title" = $1,
        "notes" = $2,
        "photoUrl" = $3
      where "entryId" = $4
      returning *;
    `;

    const params = [title, notes, photoUrl, Number(entryId)];
    const [entry] = (await db.query(sql, params)).rows;
    if (!entry) {
      throw new ClientError(404, 'invalid entry.');
    }

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// Create an endpoint to delete a particular entry. ( DELETE /entries/:entryId )
app.delete('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;

    if (
      Number.isNaN(entryId) ||
      !Number.isInteger(+entryId) ||
      Number(entryId) < 1
    ) {
      throw new ClientError(400, `Invalid entryId.`);
    }

    const sql = `
      delete from entries
      where "entryId" = $1
      returning *;
    `;

    const params = [entryId];
    const [entry] = (await db.query(sql, params)).rows;
    if (!entry) {
      throw new ClientError(404, `entryId ${entryId} does not exists.`);
    }

    res.status(200).json(entry);
  } catch (err) {
    next(err);
  }
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});

/**

 *  Error Handling
 *  - If errors occur while interacting with the backend, they must be reported and displayed to the user.
 *
 * User Management (optional)
 *  - Two additions are in the database for use with user management:
 *    - entries table:
 *      - userId: The user ID of the user who owns the entry
 *    - users table:
 *      - userId: The user's ID, auto-generated by PostgreSQL
 *      - username: The user's username
 *      - hashedPassword: The user's hashed password
 *      - createdAt: The timestamp when the user was created, auto-generated by PostgreSQL
 *
 * *****Copy freely from the user-management exercise.*****
 *
 *  - NavBar:
 *    - add a "Sign In" link if the user is not signed in
 *    - add a "Sign Out" link if the user is signed in
 *    - on sign in, route to /auth/sign-in, which displays the Auth page
 *    - on sign out, remove the token from storage and route to /
 *
 *  - Auth Page
 *    - display a Sign In page if the route is /auth/sign-in
 *    - display a Register page if the route is /auth/sign-up
 *    - display a link at the bottom of the page that routes to the other auth
 *      link (for example, "Register instead" links to /auth/sign-up)
 *
 * NOTE:
 *  - In data.ts get the JWT token from session (or local) storage and
 *    pass it in the Authorization: Bearer header.
 *
 *  - In server.ts use authMiddleware to make sure users don't
 *    access entries they do not own, using the userId in the JWT token.
 */
