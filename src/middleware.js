const axios = require('axios');

const key = 'apyx0Ol9KonQvo8YJp5ZetIUv5IEgX1xtKtsAQ1sfcCYy9YH9w';
const secret = 'FY7ntewUL1pRq9Qd0DxAHIXGSyZ8yHcxNMcrKwH1';
const org = 'RI77';
const status = 'adoptable';

function receiveUserData(req, res, next) {
  if(!req.body) {
    throw Error;
  }
res.locals.pref = req.body.preferences
res.locals.userData = req.body.user
res.locals.location = req.body.location
next()
}

async function getDogData(req, res, next){
    const pref = res.locals.pref;  
    const data = res.locals.data;
    const zipCode = pref[0].location ? pref[0].location.toString() : '07024';
   

    if(!pref) {
      throw Error;
      next();
    }
    await axios({
        url: 'https://api.petfinder.com/v2/animals?limit=' + 100 + '&status=' + status + '&location=' + zipCode + '&distance=' + 500,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + data.access_token,
          'Content-Type': 'application/x-www-form-urlencoded'
      }
      })
      .then(petData => {
       let dogArr = [];
       for(let i = 0; i < petData.data.animals.length; i++) {
         if(petData.data.animals[i].species === 'Dog' && petData.data.animals[i].primary_photo_cropped) {
             if(checksApiPreferences(petData.data.animals[i], pref)) {
               dogArr.push(petData.data.animals[i])
             }
      }
       }
       for(let i = 0; i < res.locals.postedDogs.length; i++) {
        if(checksPostedDogPreferences(res.locals.postedDogs[i], pref, zipCode)) {
          dogArr.push(res.locals.postedDogs[i])
        }
       }
       console.log('DOG ARR LENGTH', dogArr.length)
       res.locals.dogData = dogArr;
       next()
      })
      .catch(err => next(err))
  }
  
  function checksApiPreferences(dog, userPreferences){
      if(!dog.environment.children || userPreferences.children == dog.environment.children 
      && !dog.environment.cats || userPreferences.cats == dog.environment.cats
      && !dog.attributes.spayed_neutered || userPreferences.spayed == dog.attributes.spayed_neutered
      && !dog.attributes.house_trained || userPreferences.house_trained == dog.attributes.house_trained 
      && !dog.attributes.special_needs || userPreferences.special_needs == dog.attributes.special_needs 
      && !dog.attributes.shots_current || userPreferences.shots_current == dog.attributes.shots_current) return true;
        else return false;
  }
  function checksPostedDogPreferences(dog, userPreferences, zipCode){
    if(parseInt(zipCode) == dog.location 
      && !dog.children_friendly || userPreferences.children == dog.children_friendly 
      && !dog.cat_friendly || userPreferences.cats == dog.cat_friendly
      && !dog.spayed_newtered || userPreferences.spayed == !dog.spayed_newtered
      && !dog.special_needs || userPreferences.special_needs == dog.special_needs 
      && !dog.shots_current || userPreferences.shots_current == dog.shots_current) return true;
    else return false;
}

async function displayUserFavs(request, response, next){
  const favoriteDogs = response.locals.dogFavs;
  const data = response.locals.data;
  let favArrResult = [];

  for(let i = 0; i < favoriteDogs.length; i++) {
    let dogId = favoriteDogs[i];
    if(dogId.toString().length >= 4) {
      await axios({
        url: 'https://api.petfinder.com/v2/animals/' + dogId,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + data.access_token,
          'Content-Type': 'application/x-www-form-urlencoded'
      }
      }).then(dog => { 
        favArrResult.push(dog.data.animal)
      })
      .catch(err => console.log(err.data))
      if(i === favoriteDogs.length - 1) {
        response.status(200).send(favArrResult)
      }
    }
  }
  
}
  function getToken(req, res, next){

    axios.post('https://api.petfinder.com/v2/oauth2/token', 'grant_type=client_credentials&client_id=' + key + '&client_secret=' + secret)
   .then(response => {
     res.locals.data = response.data;
     next();
    })
    .catch(err => next(err))
  }

  module.exports = {
      getToken,
      getDogData,
      receiveUserData,
      displayUserFavs
  }