/**
 * Vercel serverless entry point. All /api/* traffic is rewritten here
 * (see vercel.json) and handled by the Express app.
 */
import app from "../artifacts/api-server/src/app";

export default app;
