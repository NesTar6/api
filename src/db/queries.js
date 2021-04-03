const Pool = require('pg').Pool;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const conString = "postgres://gekdbamy:bGsx_AIPrccGvowhA5gB4sHDJxTR9iHZ@queenie.db.elephantsql.com:5432/gekdbamy" //our DB url
const SALT_WORK_FACTOR = 10;

const SECRET = "NEVER EVER MAKE THIS PUBLIC IN PRODUCTION!";

const pool = new Pool({
  connectionString: conString
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

//GET USER BY ID
const getUserById = (request, response) => {
  const id = parseInt(request.params.id)
  pool.query('SELECT * FROM users WHERE user_id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

//CREATE NEW USER
const createUser = (req, res, next) => {
  const {email, password} = res.locals.userData
  const cryptPw = bcrypt.hashSync(password, SALT_WORK_FACTOR)
  
  pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING user_id', [email, cryptPw], (error, results) => {
    if (error) {
      throw error; 
      next()
    }
    res.locals.userId = results.rows[0].user_id;
    next();
  })
}

//UPDATE USER
const updateUser = (request, response) => {
  const id = parseInt(request.params.id)
  const { email, password } = request.body

  pool.query(
    'UPDATE users SET email = $1, password = $2 WHERE user_id = $3',
    [email, password, id],
    (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).send(`User modified with ID: ${id}`)
    }
  )
}

//STORE PREFERENCES DURING USER SIGNUP
const storeUserPreferences = (req, res, next) => {
  const userID = res.locals.userId;
  
  const {children, cats, spayed, house_trained, special_needs, shots_current } = res.locals.pref;
  const location = res.locals.location.zipcode;
  
  pool.query('INSERT INTO preferences (user_id, children_friendly, cat_friendly, spayed_nuetered, house_trained, special_needs, shots_current, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING preferences_id', [userID, children, cats, spayed, house_trained, special_needs, shots_current, location], (error, results) => {
    if (error) {
      throw error;
    }
    // res.status(200).send({'userId': userID})
    next()
})
}


const accessPreferences = (request, response, next) => {
  const userId = parseInt(request.params.id)
  console.log('user', userId)
  pool.query('SELECT * FROM preferences WHERE user_id = $1 LIMIT 1', [userId], (error, results) => {
    if (error) {
      throw error;
    }
  response.locals.pref = results.rows;
  next();
})
}

//POST A DOG TO THE DATABASE
const postDog = (request, response, next) => {
  const userID = parseInt(request.params.id)
  console.log(request.params)
  const {name, children, cats, spayed, special_needs, shots_current, age, gender, description, image, location} = request.body;
  pool.query('INSERT INTO new_dogs (user_id, name, children_friendly, cat_friendly, spayed_newtered, special_needs, shots_current, age, gender, description, image, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING new_dogs_id', [userID, name, children, cats, spayed, special_needs, shots_current, age, gender, description, image, location], (error, results) => {
    if (error) {
      throw error;
    }
    console.log(results.rows[0])
    response.status(200).send(`New dog added with the Id: ${results.rows[0].new_dogs_id}`)
  })
}

//GET ALL DOGS THAT HAVE BEEN POSTED BY USERS
const getPostedDogs = (req, res, next) => {
  pool.query('SELECT * FROM new_dogs', (error, results) => {
    if (error) {
      throw error
    }
    res.locals.postedDogs = results.rows
    next();
  })
}

//GET DOGS POSTED BY USER ID
const getDogsById = (request, response) => {
  const id = parseInt(request.params.id)
  pool.query('SELECT * FROM new_dogs WHERE user_id = $1', [id], (error, results) => {
    // if (error) {
    //   throw error
    // }
    console.log(id)
    console.log(results.rows)
    response.status(200).json(results.rows)
  })
}

//Delete a User
const deleteUser = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM users WHERE user_id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).send(`User deleted with ID: ${id}`)
  })
}

//SAVE DOG TO FAVORITES
const addFavorite = (req, res, next) => {

  const userID = parseInt(req.params.user_id)
  const dogID = parseInt(req.params.dog_id)

  pool.query('INSERT INTO favorites (user_id, dog_id) VALUES ($1, $2) RETURNING favorites_id', [userID, dogID], (error, results) => {
        if (error) {
          throw error;
        }
        const favorite_id = results.rows[0].favorites_id;
        res.status(200).send({'favorites_id': favorite_id})
    })
}
//GET USER FAVORITES
const getUserFavorites = (request, response, next) => {
  let favArr = [];
  const id = parseInt(request.params.id)
  pool.query('SELECT * FROM favorites WHERE user_id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    for(let dog of results.rows){
      favArr.push(dog.dog_id)
    }
    console.log('list of user favorites', favArr)
    response.locals.dogFavs = favArr;
    next()
  })
}


const getLogin = (request, response, next) => {
  const { email, password } = response.locals.userData;
  pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [email], (error, results) => {
    if (error) {
      throw error
    }
    console.log('results length', results.rows.length)
    if (!results.rows.length) {
      // status 401: unauthorized client
      response.status(401).json({ message: "Invalid Username" });
    }
   
    const foundUser = results;
     
     // if the user exists, compare hashed password to a new hash from req.body.password
     // https://www.npmjs.com/package/bcrypt
     bcrypt.compare(
      
      password, 
      foundUser.rows[0].password, function(err,results) {
      
          // bcrypt.compare returns a boolean to us, if it is false the passwords did not match!
          if (err || results === false) {
            return response.status(401).json({ message: "Invalid Password" });
          }
  
          // create a token using the sign() method
          // https://github.com/auth0/node-jsonwebtoken
 
          const token = jwt.sign(
            { email: foundUser.rows[0].email },
            SECRET,
            {
              expiresIn: 60 * 60 // expire in one hour
            }
          );

          const user_id = foundUser.rows[0].user_id;
          //http://expressjs.com/en/5x/api.html#res.cookie

          //return response.json({ user_id, token });
           console.log('POSTING ID and TOKEN', { id: user_id, token: token})
          
           response.cookie('token_and_id', { id: user_id, token: token}), {
            expires: new Date(Date.now() + '7d'),
            secure: false, // set to true if your using https
            httpOnly: true,
          };

          response.status(200).send({ id: user_id, token: token})
      });
    
  });  

}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getLogin,
  storeUserPreferences,
  accessPreferences,
  postDog, 
  getPostedDogs,
  getDogsById,
  addFavorite,
  getUserFavorites
}