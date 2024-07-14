import express from 'express';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';

import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const log = console.log;

// MIDDLEWARES GENERALES
app.use(express.json());
app.use(morgan('tiny'));
app.use(express.urlencoded({ extended: true }));

//DEJAR PÚBLICA LA CARPETA PUBLIC
app.use(express.static('public'));


//RUTA PÁGINA PRINCIPAL
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, './public/index.html'));
});


app.listen(3000, () => {
    log('Servidor escuchando en http://localhost:3000')
})