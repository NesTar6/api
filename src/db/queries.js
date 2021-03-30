const Pool = require('pg').Pool;
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const conString = "postgres://gekdbamy:bGsx_AIPrccGvowhA5gB4sHDJxTR9iHZ@queenie.db.elephantsql.com:5432/gekdbamy" //our DB url
const SALT_WORK_FACTOR = 10;

const SECRET = "NEVER EVER MAKE THIS PUBLIC IN PRODUCTION!";

const pool = new Pool({
  connectionString: conString,
  max: 5
});

pool.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  pool.query('SELECT * FROM users', function(err, result) {
    if(err) {
      return console.error('error running query', err);
    }
    console.log(result.rows[0]);
  });
});

//GET ALL USERS
const getUsers = (request, response) => {
  pool.query('SELECT * FROM users', (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

//LOGIN
const getLogin = (request, response) => {
    
  pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [request.body.email], (error, results) => {
    if (error) {
      throw error
    }
    if (results.rows.length === 0) {
      // status 401: unauthorized client
      response.status(401).json({ message: "Invalid Username" });
    }
    
    const foundUser = results;

     // if the user exists, compare hashed password to a new hash from req.body.password
     // https://www.npmjs.com/package/bcrypt
     bcrypt.compare(
          request.body.password, 
          foundUser.rows[0].password, function(err,results) {
         
            // bcrypt.compare returns a boolean to us, if it is false the passwords did not match!
            if (results === false) {
                return response.status(401).json({ message: "Invalid Password" });
            }

            // create a token using the sign() method
            // https://github.com/auth0/node-jsonwebtoken
            const token = jwt.sign(
               // the first parameter is an object which will become the payload of the token
               { email: foundUser.rows[0].email },
               // the second parameter is the secret key we are using to "sign" or encrypt the token
               SECRET,
               // the third parameter is an object where we can specify certain properties of the token
               {
                 expiresIn: 60 * 60 // expire in one hour
               }
            );
           
            const user_id = foundUser.rows[0].user_id

            // send back user_id and generated token 
            return respone.json({ user_id, token });
          
          }
      );
  })


//GET USER BY ID
const getUserById = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

//Create new user
const createUser = (request, response) => {
  const { email, password } = request.body
  const cryptPw = bcrypt.hashSync(password, SALT_WORK_FACTOR)
  
  pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING user_id', [email, cryptPw], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).send(`User added with ID: ${results.rows[0].user_id}`)
  })
}

//Update User Info
const updateUser = (request, response) => {
  const id = parseInt(request.params.id)
  const { email, password } = request.body

  pool.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3',
    [email, password],
    (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).send(`User modified with ID: ${id}`)
    }
  )
}

//Delete a User
const deleteUser = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).send(`User deleted with ID: ${id}`)
  })
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
}