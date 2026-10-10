import { HttpError } from "../utils/httpError.js";

/** Validates req[part] against a zod schema and replaces it with the parsed (stripped) value. */
export const validate = (schema, part = "body") => (req, res, next) => {
  const r = schema.safeParse(req[part] ?? {});
  if (!r.success) {
    const issue = r.error.issues[0];
    const field = issue.path.join(".");
    return next(new HttpError(400, field ? `${field}: ${issue.message}` : issue.message, "VALIDATION"));
  }
  if (part === "query") req.validatedQuery = r.data;
  else req[part] = r.data;
  next();
};
