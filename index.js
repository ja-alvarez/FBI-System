import express from 'express';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import db from './database/config.js'

const secretPassword = 'secreto'

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
        //Verificar que lleguen los datos
        if (!email || !password) {
            return res.status(400).json({ message: 'Debe proporcionar todos los datos para la autenticación.' })
        }
        //Verificar si el usuario existe
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

        //Generación token jwt
        const token = jwt.sign(usuario, secretPassword)
        // redirect
        res.status(200).json({ data: respuesta.rows, message: 'Login correcto.', token});
    } catch (error) {
        log(error.message)
        res.status(500).json({ message: 'Error interno del servidor.' })
    }
});


const verificarToken = (req, res, next) => {
    try {
        let { authorization } = req.headers;
        if (!authorization){
            return res.status(401).json({
                message: 'Debe proporcionar un token.'
            })
        };
        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, secretPassword);
        log('DECODED', decoded)
        req.usuario = decoded
        next();
    } catch (error) {
        return res.status(400).json({
            message: 'Debe proporcionar un token válido.'
        })
    }

}

// Ruta protegida -> Permite obtener la informacion de un usuario por su id
app.get('/api/v1/usuarios/:id', verificarToken, async (req, res) => {
    try {
        let { id } =req.params;
        if ( id != req.usuario.id){
            return res.status(403).json({
                message: 'Usted no tiene permiso para visualizar información de otro usuario.'
            })
        } 
        const consulta = {
            text: 'SELECT id, email, password FROM usuarios WHERE id = $1',
            values: [id]
        }
        const { rows } = await db.query(consulta)
        const usuario = rows[0]
        if (!usuario) {
            return res.status(400).json({
                message: 'Por favor verifique los datos enviados.'
            })
        };
        res.json({
            usuario
        });

    } catch (error) {
        log(error.message)
        res.status(500).json({
            message: 'Error al intentar obtener la data del usuario.'
        })
    }
}); 


app.listen(3000, () => {
    log('Servidor escuchando en http://localhost:3000')
})