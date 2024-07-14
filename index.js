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
        //log (email, password)
        if (!email || !password) {
            return res.status(400).json({message: 'Debe proporcionar todos los datos para la autenticación.'})
        }
        //Verificar usuario
        let consulta = {
            text: 'SELECT id, email FROM usuarios WHERE email = $1 AND password = $2',
            values: [email, password]
        };
        let respuesta = await db.query(consulta)
        //log('RESPUESTA: ', respuesta.rows)
        //log('Email:', respuesta.rows[0].email, 'Password:', respuesta.rows[0].password);
        let usuario = respuesta.rows[0]
        if (!usuario) {
            return res.status(400).json({
                message: "Credenciales inválidas."
            })
        };
        res.status(200).json({data: respuesta.rows, message: 'Login correcto.'});
    } catch (error) {
        log(error.message)
        res.status(500).json({message: 'Error interno del servidor.'})
    }

});


app.listen(3000, () => {
    log('Servidor escuchando en http://localhost:3000')
})