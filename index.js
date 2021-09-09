// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");
// const helmet = require("helmet");
// const yup = require("yup");
// const fetch = require("node-fetch");
// const { nanoid } = require("nanoid");
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import yup from "yup";
import { nanoid } from "nanoid";

const app = express();
const PORT = process.env.PORT || 5000;

const HASURA_OPERATION = `
mutation insertUrl($slug: String, $url: String) {
  insert_urls_one(object: {slug: $slug, url: $url}) {
    id
    slug
    url
  }
}
`;

// execute the parent operation in Hasura
const execute = async (variables) => {
  const fetchResponse = await fetch(
    "https://shawtly-url.hasura.app/v1/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: HASURA_OPERATION,
        variables,
      }),
    }
  );
  const data = await fetchResponse.json();
  console.log("DEBUG: ", data);
  return data;
};

app.use(helmet());
app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());

const schema = yup.object().shape({
  slug: yup
    .string()
    .trim()
    .matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required(),
});

app.get("/", (req, res) => {
  res.json({ message: "shawtly - shorten your urls" });
});

app.get("/:id", (req, res) => {
  // TODO: redirect to url
});

app.post("/url", async (req, res, next) => {
  // TODO: create a new short url
  let { arg } = req.body.input;
  let { slug, url } = arg;
  try {
    if (!slug) {
      slug = nanoid(5);
    }
    slug = slug.toLowerCase();
    await schema.validate({ slug, url });
    const { data, errors } = await execute({ slug, url });

    // if Hasura operation errors, then throw error
    if (errors) {
      return res.status(400).json(errors[0]);
    }

    // success
    return res.json({
      ...data.insert_urls_one,
    });
    // return res.json({ slug, url });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  }
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : error.stack,
  });
});

app.listen(PORT, () => {
  console.log(`App started on ${PORT}`);
});
