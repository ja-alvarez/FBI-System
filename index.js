import express from 'express';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import fileUpload from 'express-fileupload';
import db from './database/config.js'
import { create } from 'express-handlebars';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const log = console.log;
const secretPassword = 'secreto'

// Inicio configuracion handlebars
const hbs = create({
    partialsDir: [
        path.resolve(__dirname, "./views/partials/"),
    ],
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));
// Fin configuracion handlebars


// MIDDLEWARES GENERALES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload()); //permite procesar ademas de imagenes, data recibidos del formdata
app.use(morgan('tiny'));

//DEJAR PÚBLICA LA CARPETA PUBLIC
app.use(express.static('public'));

const verificarToken = (req, res, next) => {
    try {
        const { authorization } = req.headers;
        let token;
        if (authorization) {
            token = authorization.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        } else {
            return res.status(401).json({
                message: 'Debe proporcionar un token.'
            });
        };
        const decoded = jwt.verify(token, secretPassword);
        log('DECODED', decoded)
        req.usuario = decoded
        next();
    } catch (error) {
        log(error.message)
        return res.status(400).json({
            message: 'Debe proporcionar un token válido.'
        })
    }
};

//RUTAS VISTAS
app.get('/', (req, res) => {
    res.render('home')
});

app.get('/login', (req, res) => {
    res.render('login')
});

app.get('/perfil', verificarToken, async (req, res) => {
    try {
        let { rows } = await db.query ('SELECT id, email FROM usuarios WHERE id = $1', [req.usuario.id])
        let usuario = rows[0];
        res.render('perfil', {
            usuario
        })
    } catch (error) {
        res.render('perfil', {
            error: 'Error'
        })
    }
});

// RUTAS ENDPOINTS
app.post('/api/v1/SignIn', async (req, res) => {
    try {
        let { email, password } = req.body;
        log('email: ', email, 'password', password)
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
        const token = jwt.sign(usuario, secretPassword) //, { expiresIn: '15s' }
        // redirect
        res.status(200).json({ data: respuesta.rows, message: 'Login correcto.', token });
    } catch (error) {
        log(error.message)
        res.status(500).json({ message: 'Error interno del servidor.' })
    }
});



app.listen(3000, () => {
    log('Servidor escuchando en http://localhost:3000')
});

 