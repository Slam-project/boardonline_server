/* 		
		---------------------------------------
				REQUIRES    !!!!!!!!!!!
		---------------------------------------
*/

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


/* 		
		---------------------------------------
			FUNCTION MONGODB    !!!!!!!!!!!
		---------------------------------------
*/

/**
 *	Function recover all cv 10 per 10 for the main list
 *
var findCv = function (db, callback, idBase) {
	var collection = db.collection('cv').find( { "_id": { $lt : idBase } } ).sort( { _id: -1} ).limit(10);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			console.log(doc);

		} else {
			callback();
		}
	});
}*/

/**
 *	Function recover User
 */
 var findUser = function (db, callback, login, mdp) {
	var collection = db.collection('user').find({"login": {$eq : login}, "mdp": {$eq : mdp}});
	collection.each(function(err, doc) {
		assert.equal(err, null);
		callback(doc);
	});
}

/**
 *	Function recover all cv 10 per 10 for the main list
 */
var findFirstCv = function (db, callback) {
	var collection = db.collection('cv').find().sort( { _id: -1} ).limit(10);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			callback(doc);
		}
	});
}

/**
 *
 */
var findSelfCv = function (db, callback, cv_id) {
	var collection = db.collection('cv').find({"_id": {$eq : cv_id}});
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			callback(doc);
		}
	});
}

/**
 *	Function recover all xp for cv details
 */
var findXp = function (db, callback, id_cv) {
	console.log(id_cv);
	var collection = db.collection('xp').find({"cv_id": { $eq : id_cv }}).limit(5);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			callback(doc);
		}
	});
}

/**
 *	Function recover all comp for cv details
 */
var findComp = function (db, callback, id_cv) {
	console.log(id_cv);
	var collection = db.collection('comp').find({"cv_id": { $eq : id_cv }}).limit(5);
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


/**
	 	-------------------------------------
			LES SOCKETS   !!!!!!!!!!!!!!!
		-------------------------------------
**/		

function sendSelfCV(socket, cv_id) {
	findSelfCv(db, function(data) {
		socket.emit('newSelfCV', data._id, data.name, data.fname, data.title, data.lform, data.periode);
		console.log("TESTEST");
	}, cv_id);
}

// On attend qu'un client se connecte
io.sockets.on('connection', function (socket) {
	socket.lastCvId = -2;
	var id_cv = -1;
	console.log("Connection");

	// On envoit un message de confirmation au client
	socket.emit('connected', 'Vous êtes bien connecté !');
	

	// On écoute le client --> veut se co
	socket.on('connect', function(login, password) {
	    // if login and password match to something in the database

		findUser(db, function(data) {
			
			if (data != null) {
				id_cv = data.cv_id;
				socket.emit('co', id_cv);
				
				sendSelfCV(socket, id_cv);
				
		    } else {
		        socket.emit('dis', 'bad credentials');
			}
		}, login, password);	
	});


	// On écoute le client --> réclame un CV et on lui envoie les data
	socket.on('loadCV', function (lastCvId) {
		// BDD --> _id / name / fname / title / lform / periode
		console.log('loadCV : ' + lastCvId);			

		if (socket.lastCvId == lastCvId) {

		} else if (lastCvId == -1) {
			findFirstCv(db, function(data) {
				// Send BDD --> Message : Id, 		Nom, 		Prenom, 	Titre, 	Dernière formation, période
				socket.emit('newCV', data._id, data.name, data.fname, data.title, data.lform, data.periode);
			});
		}
	});


	// On écoute le client --> réclame les Xp d'un CV
	socket.on('loadXP', function (cv_id) {

		findXp(db, function(data) {
			console.log("xp find : " + data);
			// Send BDD --> Msg:  cv_id   /   _id  /   periode   /   client   /   poste   /   mission 
			socket.emit('newXP', cv_id, data._id, data.periode, data.client, data.poste, data.mission);
		}, cv_id);
	});

	// On écoute le client --> réclame les compétences d'un CV
	socket.on('loadSkill', function (cv_id) {

		findComp(db, function(data) {
			console.log("comp find :" + cv_id);

			// Send BDD --> Message : Id_Cv / Id / catégorie / environnement / xp
			socket.emit('newSkill', cv_id, data._id, data.categorie, data.environment, data.xp);
		}, cv_id);
	});

});

server.listen(8080);
