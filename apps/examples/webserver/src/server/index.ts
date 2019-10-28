import path from 'path';
import express from 'express';

import htmlMiddleware from './middleware/html';
import renderMiddleware from './middleware/render';
import cors from "./middleware/cors";

const publicPath = path.join(__dirname, '/public');
const app = express();

app.use(cors(app));
app.use(express.static(publicPath));
app.use(htmlMiddleware());
app.use(renderMiddleware());

export default app;
