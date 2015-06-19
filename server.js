// Nos requires

var http = require('http');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://192.168.1.8:27017/boardonline';
var assert = require('assert');
var db;

// On créé une nouvelle instance de serveur
var server = http.createServer();

// Chargement de socket.io
var io = require('socket.io').listen(server);

var findCv = function (db, callback, idBase ) {
	var collection = db.collection('cv').find( { "_id": { $lt : idBase } } ).sort( { _id: -1} ).limit(10);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			console.log(doc);

		} else {
			callback();
		}
	});
}

var findFirstCv = function (db, callback ) {
	var collection = db.collection('cv').find().sort( { _id: -1} ).limit(10);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			callback(doc);
		}
	});
}

MongoClient.connect(url, function(err, bdd) {
	db = bdd;
	assert.equal(null, err);
});


// On attend qu'un client se connecte
io.sockets.on('connection', function (socket) {
	socket.lastCvId = -2;
	console.log("Connection");

	// On envoit un message de confirmation au client
	socket.emit('connected', 'Vous êtes bien connecté !');
	
	// On attend que le client réclame un CV et on lui envoie les data
	socket.on('loadCV', function (lastCvId) {
		// BDD --> _id / name / fname / title / lform / periode
		console.log('loadCV : ' + lastCvId);
				

		if (socket.lastCvId == lastCvId) {

		} else if (lastCvId == -1) {
			findFirstCv(db, function(data) {
				console.log(data);
				socket.emit('newCV', data._id, data.name, data.fname, data.title, data.lform, data.periode);
			});
		}

		// Send --> Message : Id, Nom, Prenom, Titre, Dernière formation, période
		//socket.emit('newCV', 1,'Buirette','Quentin','Titre','Last Form','2 mois');

	});

	socket.on('loadXP', function (lastCvId) {

		console.log('loadXP : ' + lastCvId);

		// BDD --> _id / periode / client / poste / mission

		// Send --> Message : Id_client, Id, période, client, poste, mission
		socket.emit('newXP', socket.lastCvId,1,'2 mois','Carrefour','astronaute','Manger des Glaces');
		socket.emit('newXP', socket.lastCvId,1,'2 mois','Auchan','caissier','Manger des stroumphs');
		socket.emit('newXP', socket.lastCvId,1,'2 mois','Leclerc','Agent rayon','Manger des pommes');
		socket.emit('newXP', socket.lastCvId,1,'2 mois','Aldi','agent d\'entretien','Manger des Prunes');
	});

	socket.on('loadSkill', function (message) {
		console.log('loadSkill' + message);
		socket.idClient = message;

		// Send --> Message : Id_Client, Id, catégorie, environnement skil, xp
		socket.emit('newSkill', socket.idClient,4,'Informatique','Maison','installation server');
		socket.emit('newSkill', socket.idClient,3,'Domotique','Maison','installation server');
		socket.emit('newSkill', socket.idClient,2,'Robotique','Maison','installation server');
		socket.emit('newSkill', socket.idClient,1,'Jetenique','Boite','installation server');
		socket.emit('newSkill', socket.idClient,5,'Cuisine','Maison','installation server');
		socket.emit('newSkill', socket.idClient,6,'Jardinage','Boite','installation server');
	});

});

server.listen(8080);
