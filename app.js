/* global Peer, THREE, $ */
'use strict';

// THREE vars
var scene, camera, renderer,
    cube, effect, element,
    texture,
    container = document.getElementById('container');

// RTC vars
var peer, myId,
    disconnect = document.getElementById('disconnect'),
    video = document.createElement('video'),
    localStream, connection;

initMedia();
initThree();
initPeering();
getUsers();

function initMedia() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  // Setup the hidden video element for when we get a remote stream
  video.width = 1024;
  video.height = 768;
  video.autoplay = true;
  video.loop = true;

  // Find the outward facing camera
  window.MediaStreamTrack.getSources(function(srcs) {
    var cams = srcs.filter(function(stream) {
      return stream.kind == 'video' && stream.facing == 'environment';
    });
    var opts = {
      audio: false
    };

    // Can't find an environment camera
    if (cams.length < 1) {
      opts.video = true;
    }
    // Found an environment camera
    else {
      opts.video = {
        optional: [{sourceId: cams[0].id }]
      };
    }

    navigator.getUserMedia(opts, function(mediaStream) {
      localStream = mediaStream;
    }, function(err) {
      console.error(err);
    }); 
  });
}

function initThree() {
  renderer = new THREE.WebGLRenderer();
  element = renderer.domElement;
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
  scene.add(camera);

  effect = new THREE.StereoEffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);

  var geometry = new THREE.BoxGeometry(300, 300, 300);
  texture = new THREE.Texture(video);

  var material = new THREE.MeshBasicMaterial({ map: texture });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  camera.position.z = 400;
  scene.add(camera);

  window.addEventListener('resize', onResize, false);
  container.addEventListener('click', fullscreen, false);
}

function initPeering() {
  peer = new Peer({key: 'lwjd5qra8257b9'});

  peer.on('open', function(id) {
    console.log(id);
    myId = id;
  });

  peer.on('connection', function(conn) {
    connection = conn;

    connection.on('open', function() {
      console.log('Connection has been opened');

      connection.on('data', function(data) {
        console.log(data);
      });

      connection.on('close', function() {
        console.log('connection closed');
        container.removeChild(container.children[0]);
        disconnect.disabled = true;
      });
    });
  });

  peer.on('call', function(call) {
    console.log('got a call');
    disconnect.disabled = false;

    if (localStream)
      call.answer(localStream);

    call.on('stream', function(remoteStream) {
      console.log('got a stream');
      video.src = window.URL.createObjectURL(remoteStream);
      container.appendChild(element);
      render();
    });
  });

  $('#connect').click(function() {
    var dest = $('#users').val();

    connect(dest);
  });

  disconnect.onclick = function() {
    connection.close();
    container.removeChild(container.children[0]);
    disconnect.disabled = true;
  };
}

function fullscreen() {
  container.requestFullscreen = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullscreen || container.msRequestFullscreen;
  container.requestFullscreen();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  effect.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  requestAnimationFrame(render);

  if (video.readyState == video.HAVE_ENOUGH_DATA)
    texture.needsUpdate = true;

  renderer.render(scene, camera);
  effect.render(scene, camera);
}

function getUsers() {
  var userList = document.getElementById('users');

  $.get('/users', function(users) {
    users.forEach(function(user) {
      var el = document.createElement('option');
      el.value = user.peerId;
      el.innerText = user.name;
      el.onclick = function() {
        $('#connect').attr('disabled', false);
      };

      userList.appendChild(el);
    });
  });
}

function connect(dest) {
  connection = peer.connect(dest);

  if (localStream && peer) {
    peer.call(dest, localStream)
    .on('stream', function(remoteStream) {
      console.log('got a stream');
      video.src = window.URL.createObjectURL(remoteStream);
      container.appendChild(element);
      disconnect.disabled = false;
      render();
    });
  }

  console.log('Connecting to %s', dest);
}

$('#regForm').submit(function(e) {
  e.preventDefault();

  var myName = $('#name');

  $.post('/users', {
    peerId: myId,
    name: myName.val()
  }, function() {
    console.log('registered');

    myName.attr('disabled', true);
    $('#regBtn').attr('disabled', true);
  });
});

$(window).unload(function() {
  $.ajax('/users', {
    type: 'DELETE',
    data: {
      peerId: myId
    }
  });
});
