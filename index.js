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

app.use('/administracion', express.static(path.join(__dirname, 'public')));

const verificarToken = async (req, res, next) => {
    try {
        const { authorization } = req.headers;
        let token;
        if (authorization) {
            token = authorization.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        } else {
            if (req.url.includes('api/')) {
                return res.status(401).json({
                    message: 'Debe proporcionar un token.'
                });
            } else {
                return res.render('error', {
                    message: 'Petición incorrecta.'
                })
            }
        };
        const decoded = jwt.verify(token, secretPassword);
        log('DECODED', decoded)
        req.usuario = decoded

        let { rows } = await db.query('SELECT admin FROM usuarios WHERE id = $1 ', [decoded.id]);
        req.usuario.admin = rows[0].admin

        next();
    } catch (error) {
        log(error.message)
        if (req.url.includes('api/')) {
            return res.status(400).json({
                message: 'Debe proporcionar un token válido.'
            })
        } else {
            return res.render('error', {
                message: 'Debe proporcionar un token válido.'
            }) // res.render()
        }



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
        let { rows } = await db.query('SELECT id, email FROM usuarios WHERE id = $1', [req.usuario.id])
        let usuario = rows[0];
        res.render('perfil', {
            usuario
        })
    } catch (error) {
        res.render('perfil', {
            error: 'No fue posible mostrar sus datos, intente más tarde.'
        })
    }
});

app.get('/administracion/usuarios', verificarToken, async (req, res) => { //verificarToken, 
    try {
        let { rows } = await db.query('SELECT admin FROM usuarios WHERE id = $1', [req.usuario.id])

        let admin = rows[0].admin
        if (admin == false) { // rows[0].admin == false
            return res.render('adminUsuarios', {
                error: 'Usted no es administrador, no puede entrar a esta vista.',
                notAdmin: true
            })
        }
        // if (req.usuario.admin == false) {
        //     return res.render('adminUsuarios', {
        //         error: 'Usted no es administrador, no puede entrar a esta vista.',
        //         notAdmin: true
        //     })
        // }
        let { rows: usuarios } = await db.query('SELECT id, email, admin FROM usuarios ORDER BY id');
        res.render('adminUsuarios', {
            usuarios
        })
    } catch (error) {
        res.render('adminUsuarios', {
            error: 'No fue posible cargar los datos de la vista, intente más tarde.'
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
            text: 'SELECT id, email, admin FROM usuarios WHERE email = $1 AND password = $2',
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
        res.status(200).json({
            data: respuesta.rows,
            message: 'Login correcto.',
            token,
            usuario
        });
    } catch (error) {
        log(error.message)
        res.status(500).json({ message: 'Error interno del servidor.' })
    }
});

// Ruta protegida -> Permite obtener la informacion de un usuario por su id
app.get('/api/v1/usuarios/:id', verificarToken, async (req, res) => {
    try {
        let { id } = req.params;
        // if(req.usuario.admin == false) { }
        if (id != req.usuario.id) {
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

app.put('/api/v1/usuarios/admin/:id', verificarToken, async (req, res) => {
    try {
        // Verificar si el usuario que intenta cambiar estado administracion tiene permisos
        if (req.usuario.admin == false) {
            return res.status(403).json({
                message: 'Usted no tiene el nivel de acceso para esta operación.'
            })
        }
        let id = req.params.id;
        let { rows } = await db.query('SELECT admin FROM usuarios WHERE id = $1 ', [id])
        let usuario = rows[0]
        if (!usuario) {
            return res.status(404).json({
                message: 'No fue posible encontrar al usuario que desea modificar.'
            })
        }
        let admin = !usuario.admin
        await db.query('UPDATE usuarios SET admin = $1 WHERE id = $2', [admin, id])
        res.status(201).json({
            message: 'Se ha cambiado el estado de administrador al usuario.'
        })
    } catch (error) {
        log(error)
        res.status(500).json({
            message: 'Ha ocurrido un error al intentar cambiar el estado del usuario.'
        })
    }
});

app.get('*', (req, res) => {
    res.status(404).render('404')
});

app.listen(3000, () => {
    log('Servidor escuchando en http://localhost:3000')
});

/* 
    - Eliminar log, variables sin utilizar
    - Eliminar dependencias sin usar
    - Revisar rúbrica
    - background color*
    - Corregir lógica lado del cliente
    - Corregir rutas, token

        token en SessionStorage con un tiempo de expiración de 2 minutos.
*/