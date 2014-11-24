/* global Peer, THREE */
'use strict';

// THREE vars
var scene, camera, renderer,
    cube, effect, element,
    texture,
    container = document.getElementById('container');

// RTC vars
var peer,
    destInput = document.getElementById('dest'),
    go = document.getElementById('go'),
    video = document.createElement('video'),
    localStream, conn;

initMedia();
initThree();
initPeering();

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
      destInput.disabled = false;
      go.disabled = false;
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
    document.getElementById('myId').innerText = id;
  });

  peer.on('connection', function(conn) {
    conn.on('open', function() {
      console.log('Connection has been opened');

      conn.on('data', function(data) {
        console.log(data);
      });
    });
  });

  peer.on('call', function(call) {
    console.log('got a call');
    if (localStream)
      call.answer(localStream);

    call.on('stream', function(remoteStream) {
      console.log('got a stream');
      video.src = window.URL.createObjectURL(remoteStream);
      container.appendChild(element);
      render();
    });
  });

  go.onclick = function() {
    var dest = destInput.value;

    conn = peer.connect(dest);

    if (localStream)
      peer.call(dest, localStream)
      .on('stream', function(remoteStream) {
        console.log('got a stream');
        video.src = window.URL.createObjectURL(remoteStream);
        container.appendChild(element);
        render();
      });

    console.log('Connecting to %s', dest);
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
