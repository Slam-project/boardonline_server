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
 *	Function recover User
 */
 var findUser = function (db, callback, login, mdp) {
	var collection = db.collection('user').findOne({"login": {$eq : login}, "mdp": {$eq : mdp}}, function(err, item) {
		assert.equal(null, err);
		callback(item);
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
 *	Function recover your own CV
 */
var findSelfCv = function (db, callback, cv_id) {
	var collection = db.collection('cv').findOne({"_id": {$eq : cv_id}}, function(err, item) {
		assert.equal(null, err);
		callback(item);
	});
}

/**
 *	Function recover all xp for cv details
 */
var findXp = function (db, callback, id_cv) {
	var collection = db.collection('xp').find({"cv_id": { $eq : id_cv }}).limit(5);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			callback(doc);
		}
	});
}

/**
 *	Function recover only your own CV
 */
var findSelfXP = function (db, callback, cv_id) {
	var collection = db.collection('xp').find({"_id": {$eq : cv_id}});
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
	var collection = db.collection('comp').find({"cv_id": { $eq : id_cv }}).limit(5);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			callback(doc);
		}
	});
}

/**
 *	Function Insérer un nouveau CV
 */
var insertCV = function(db, nom, prenom, titre, id_user, callback) {
	var lastId = -1;

	var collection = db.collection('cv').find().sort( { _id: -1} ).limit(1);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			lastId = doc._id + 1;
			db.collection('cv').insert({"_id": lastId, "name": nom, "fname": prenom, "title": titre, "lform": "none", "periode": "none"});
			db.collection('user').update({"_id": id_user}, {$set: {cv_id: lastId}});
			callback(lastId);
		}
	});
}

/**
 *	Function mise à jour d'un CV existant
 */
var majCV = function(db, cv_id, nom, prenom, titre) {
	var collection = db.collection('cv').update(
		{"_id": cv_id}, 
		{ $set: {"name": nom, "fname": prenom, "title": titre, "lform": "none", "periode": "none"}}
	);
}

/**
 *	Function Insérer une xp
 */
var insertXP = function(db, dateD, dateF, client, poste, mission, cv_id) {
	var lastXPId;

	var collection = db.collection('xp').find().sort( { _id: -1} ).limit(1);
	collection.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			lastXPId = doc._id + 1;
			var periode = dateDiff(dateD, dateF);
			db.collection('xp').insert({"_id": lastXPId, "periode": periode, "client": client, "poste": poste, "mission": mission, "cv_id": cv_id});
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

	/*
		LES FONCTIONS "SELF" --> RECUP DE SON PROPRE CV
	*/

function sendSelfCV(socket, cv_id) {
	findSelfCv(db, function(data) {
		if (data != null) {
			socket.emit('newSelfCV', data._id, data.name, data.fname, data.title, data.lform, data.periode);
		} else {
			socket.emit('newSelfCV', -1, "", "", "", "", "");
		}

		socket.emit('co', socket.id_cv);
	}, cv_id);
}

function sendSelfXP() {
	findSelfXP(db, function (data) {
		socket.emit('newXP', cv_id, data._id, data.periode, data.client, data.poste, data.mission);
	}, cv_id);
}

	/*
		LES APPELS ET LES RECEPTIONS DES SOCKETS
	*/

// On attend qu'un client se connecte
io.sockets.on('connection', function (socket) {
	socket.lastCvId = -2;
	socket.id_cv = -1;
	socket.user_id = -1;
	console.log("Connection");

	// On envoit un message de confirmation au client
	socket.emit('connected', 'Vous êtes bien connecté !');
	
	// On écoute le client --> veut se co
	socket.on('connect', function(login, password) {
	    // if login and password match to something in the database
		findUser(db, function(data) {
			
			if (data != null) {
				socket.user_id = data._id;

				if (data.cv_id == null) {
					socket.id_cv = -1;
				} else {
					socket.id_cv = data.cv_id;
				}

				sendSelfCV(socket, socket.id_cv);
				
		    } else if (socket.user_id == -1) {
		        socket.emit('dis', 'bad credentials');
			}
		}, login, password);	
	});

	// On écoute le client --> réclame un CV et on lui envoie les data
	socket.on('loadCV', function (lastCvId) {
		// BDD --> _id / name / fname / title / lform / periode			

		if (socket.lastCvId == lastCvId) {

		} else if (lastCvId == -1) {
			findFirstCv(db, function(data) {
				// Send BDD --> Message : Id, 	  Nom, 		Prenom, 	Titre, 	Dernière formation, période
				socket.emit('newCV', data._id, data.name, data.fname, data.title, data.lform, data.periode);
			});
		}
	});

	socket.on('editCV', function(nom, prenom, titre) {
		if (socket.id_cv == -1) {
			insertCV(db, nom, prenom, titre, socket.user_id, function(data) {
				socket.id_cv = data;
				sendSelfCV(socket, socket.id_cv);
			});
		} else {
			majCV(db, socket.id_cv, nom, prenom, titre);
		}
	});

	// On écoute le client --> réclame les Xp d'un CV
	socket.on('loadXP', function (cv_id) {

		findXp(db, function(data) {
			// Send BDD --> Msg / cv_id / _id  /   periode   /    client    /   poste   /   mission 
			socket.emit('newXP', cv_id, data._id, data.periode, data.client, data.poste, data.mission);
		}, cv_id);
	});

	// On écoute le client --> réclame les compétences d'un CV
	socket.on('loadSkill', function (cv_id) {

		findComp(db, function(data) {
			// Send BDD --> Msg  /  Id_Cv /   Id   /   catégorie   /  environnement  /   xp
			socket.emit('newSkill', cv_id, data._id, data.categorie, data.environment, data.xp);
		}, cv_id);
	});

});

server.listen(8080);
