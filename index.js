import express from 'express';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import db from './database/config.js'

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

app.post('/SignIn', async (req, res) => {
    try {
        let { email, password } = req.body;
        log (email, password)
        if (!email || !password) {
            return res.status(400).json({message: 'Debe proporcionar todos los datos para la autenticación.'})
        }
        let consulta = {
            text: 'SELECT email, password FROM usuarios WHERE email = $1',
            values: [email]
        };
        let respuesta = await db.query(consulta)
        //log('RESPUESTA: ', respuesta.rows)
        //log('Email:', respuesta.rows[0].email, 'Password:', respuesta.rows[0].password);
        res.status(200).json(respuesta.rows);
    } catch (error) {
        log(error.message)
        res.status(500).json({message: 'Error interno del servidor.'})
    }

});


app.listen(3000, () => {
    log('Servidor escuchando en http://localhost:3000')
})