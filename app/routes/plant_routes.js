// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for plants
const Plant = require('../models/plant')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { plant: { title: '', text: 'foo' } } -> { plant: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

//* INDEX
//* /plants
router.get('/plants', (req, res, next) => {
    Plant.find()
        .populate('owner')
        .then(plants => {
            return plants.map(plant => plant)
        })
        .then(plants => {
            res.status(200).json({ plants: plants })
        })
        .catch(next)
})

//* SHOW
//* /plants/:id
router.get('/plants/:id', (req, res, next) => {
    Plant.findById(req.params.id)
        .populate('owner')
        .then(handle404)
        .then(plant => {
            res.status(200).json({ plant: plant})
        })
        .catch(next)
})

//* CREATE
//* /plants
router.post('/plants', requireToken, (req, res, next) => {
    req.body.plant.owner = req.user.id

    // on the front end, I HAVE to send a plant as the top level key
    Plant.create(req.body.plant)
    .then(plant => {
        res.status(201).json({ plant: plant })
    })
    .catch(next)
    // ^^^ shorthand for:
        //^ .catch(error => next(error))
})

// UPDATE
// PATCH /plants/5a7db6c74d55bc51bdf39793
router.patch('/plants/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.plant.owner

	Plant.findById(req.params.id)
		.then(handle404)
		.then((plant) => {
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, plant)

			// pass the result of Mongoose's `.update` to the next `.then`
			return plant.updateOne(req.body.plant)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})


//* DESTROY
router.delete('/plants/:id', requireToken, (req, res, next) => {
	Plant.findById(req.params.id)
		.then(handle404)
		.then((plant) => {
			// throw an error if current user doesn't own `plant`
			requireOwnership(req, plant)
			// delete the plant ONLY IF the above didn't throw
			plant.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})


module.exports = router