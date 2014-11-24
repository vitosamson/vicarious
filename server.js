'use strict';

var express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    mongoose = require('mongoose');

//------ DB ------//
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/vicarious');

var UserSchema = new mongoose.Schema({
  peerId: {
    type: String,
    unique: true
  },
  name: String,
  busy: {
    type: Boolean,
    default: false
  }
});

var User = mongoose.model('User', UserSchema);


//------ WEB ------//

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/', function(req, res) {
  res.sendFile('index.html');
});

app.get('/users', function(req, res) {
  User.find(function(err, users) {
    if (err)
      return res.status(500).send(err);

    res.json(users);
  });
});

app.post('/users', function(req, res) {
  if (!req.body.name || !req.body.peerId)
    return res.status(400).send('name and peerId are required');

  var user = new User({
    name: req.body.name,
    peerId: req.body.peerId
  });

  user.save(function(err) {
    if (err)
      return res.status(500).send(err);

    res.status(200).end();
  });
});

app.delete('/users', function(req, res) {
  if (!req.body.peerId)
    return res.status(400).send('peerId is required');

  User.remove({peerId: req.body.peerId}, function(err) {
    if (err)
      return res.status(500).send(err);

    res.status(200).send('user was deleted');
  });
});

app.listen(process.env.PORT || 3000);
