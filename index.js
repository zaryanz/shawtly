const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const yup = require("yup");
const { nanoid } = require("nanoid");

const app = express();
const PORT = process.env.PORT || 5000;

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
    return res.json({ slug, url });
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
