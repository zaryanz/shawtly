import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import yup from "yup";
import { nanoid } from "nanoid";

const app = express();
const PORT = process.env.PORT || 5000;

const HASURA_OPERATION_FIND = `
query findUrlBySlug($slug: String) {
  urls(where: {slug: {_eq: $slug}}) {
    id
    slug
    url
  }
}
`;

// execute the parent operation in Hasura
const findUrlBySlug = async (variables) => {
  const fetchResponse = await fetch(
    "https://shawtly-url.hasura.app/v1/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: HASURA_OPERATION_FIND,
        variables,
      }),
      headers: {
        "x-hasura-admin-secret":
          "UYCuFbqd26kubdt34Zdm9XOtRWud4V1FiFNDCKaRVSK856NCUgBvpptYUGS1nNH9",
      },
    }
  );
  const data = await fetchResponse.json();
  console.log("DEBUG: ", data);
  return data;
};

const HASURA_OPERATION_ADD = `
mutation insertUrl($slug: String, $url: String) {
  insert_urls_one(object: {slug: $slug, url: $url}) {
    id
    slug
    url
  }
}
`;

const addUrlToDb = async (variables) => {
  const fetchResponse = await fetch(
    "https://shawtly-url.hasura.app/v1/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: HASURA_OPERATION_ADD,
        variables,
      }),
      headers: {
        "x-hasura-admin-secret":
          "UYCuFbqd26kubdt34Zdm9XOtRWud4V1FiFNDCKaRVSK856NCUgBvpptYUGS1nNH9",
      },
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

app.post("/find", async (req, res, next) => {
  let { slug } = req.body.input;
  const { data, errors } = await findUrlBySlug({ slug });

  if (errors) {
    return res.status(400).json(errors[0]);
  }

  if (data.urls.length === 0) {
    return next({ message: "slug does not exist" });
  }

  return res.json({
    ...data.urls[0],
  });
});

app.post("/url", async (req, res, next) => {
  let { arg } = req.body.input;
  let { slug, url } = arg;
  let exists = undefined;
  try {
    if (!slug) {
      slug = nanoid(5);
    } else {
      exists = await findUrlBySlug({ slug });
      if (exists.data.urls.length !== 0) {
        console.log("EXISTS", exists);
        return next({ message: "slug already exists" });
      }
    }
    slug = slug.toLowerCase();
    await schema.validate({ slug, url });
    const { data, errors } = await addUrlToDb({ slug, url });

    if (errors) {
      return res.status(400).json(errors[0]);
    }

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
